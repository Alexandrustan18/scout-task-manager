# GCP Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the scout-task-manager backend off Supabase Cloud (currently blocked by exceeded egress quota) onto a dedicated self-hosted Supabase stack on a GCP `e2-medium` VM in `scout-ai-491712 / europe-west1-b`, with zero data loss and minimal app-side changes.

**Architecture:** Single Debian 12 VM running Supabase's official `docker-compose` (Postgres 15 + PostgREST + Realtime + Kong + Studio). nginx in front for TLS termination at `api.work-heyads.ro`. Data migrated from Supabase via dashboard SQL Editor → CSV → `\copy` import. App.jsx swaps 4 URLs + 1 anon key. Nightly `pg_dump` to a GCS bucket. Approved spec at `docs/superpowers/specs/2026-05-18-gcp-migration-design.md`.

**Tech Stack:** GCP (Compute Engine, Cloud Storage, IAM), Debian 12, Docker, Supabase self-host (Postgres 15, PostgREST 12+, Realtime Phoenix/Elixir, Kong API gateway), nginx, Certbot/Let's Encrypt, Vite + React 18.

**Pre-flight:** Team is offline for the duration. Realistic window: 4-6 hours. `gcloud` is authenticated as `peltea.bogdann@gmail.com` on project `scout-ai-491712`.

---

## Task 1: Reserve static IP + create firewall rule + service account + backup bucket

**Files:**
- None (GCP resources, no local files)

- [ ] **Step 1: Reserve static external IP for the new VM**

Run:
```bash
gcloud compute addresses create scout-tasks-ip \
  --region=europe-west1 \
  --project=scout-ai-491712
gcloud compute addresses describe scout-tasks-ip \
  --region=europe-west1 \
  --format="value(address)"
```

Expected: outputs the reserved IPv4 address (e.g. `35.x.x.x`). **Save this IP — you'll need it for the DNS step and nginx config.**

- [ ] **Step 2: Create firewall rule allowing 80 + 443 to the `scout-tasks-api` tag**

Run:
```bash
gcloud compute firewall-rules create allow-tasks-https \
  --network=default \
  --direction=INGRESS \
  --priority=1000 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=scout-tasks-api \
  --allow=tcp:80,tcp:443 \
  --description="HTTPS/HTTP to api.work-heyads.ro on scout-tasks VM"
```

Verify:
```bash
gcloud compute firewall-rules describe allow-tasks-https --format="value(allowed)"
```

Expected: `tcp:80;tcp:443` (or similar formatted output listing both ports).

- [ ] **Step 3: Create service account for the VM**

Run:
```bash
gcloud iam service-accounts create scout-tasks-sa \
  --display-name="Scout Tasks VM" \
  --description="Dedicated SA for scout-tasks VM — backup uploads + minimal scopes"
```

Verify:
```bash
gcloud iam service-accounts describe scout-tasks-sa@scout-ai-491712.iam.gserviceaccount.com \
  --format="value(email)"
```

Expected: `scout-tasks-sa@scout-ai-491712.iam.gserviceaccount.com`

- [ ] **Step 4: Create the GCS backup bucket**

Run:
```bash
gcloud storage buckets create gs://scout-ai-491712-tasks-backups \
  --location=europe-west1 \
  --uniform-bucket-level-access \
  --project=scout-ai-491712
```

Expected: bucket created, `Creating gs://scout-ai-491712-tasks-backups/...` and no error.

- [ ] **Step 5: Set 30-day lifecycle deletion on the bucket**

Create `/tmp/bucket-lifecycle.json`:
```bash
cat > /tmp/bucket-lifecycle.json <<'EOF'
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 30}
    }
  ]
}
EOF
gcloud storage buckets update gs://scout-ai-491712-tasks-backups \
  --lifecycle-file=/tmp/bucket-lifecycle.json
```

Verify:
```bash
gcloud storage buckets describe gs://scout-ai-491712-tasks-backups \
  --format="value(lifecycle)"
```

Expected: shows lifecycle rule with `age=30 → Delete`.

- [ ] **Step 6: Grant the service account `storage.objectAdmin` on the bucket only**

Run:
```bash
gcloud storage buckets add-iam-policy-binding gs://scout-ai-491712-tasks-backups \
  --member="serviceAccount:scout-tasks-sa@scout-ai-491712.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

Expected: prints updated IAM policy with the binding. No project-level permissions granted.

- [ ] **Step 7: Commit nothing — these are GCP resources, no local file changes**

(No commit; resources tracked in GCP only.)

---

## Task 2: Create the VM

**Files:**
- None (GCP resource)

- [ ] **Step 1: Create the `scout-tasks` VM**

Run:
```bash
gcloud compute instances create scout-tasks \
  --project=scout-ai-491712 \
  --zone=europe-west1-b \
  --machine-type=e2-medium \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-balanced \
  --boot-disk-device-name=scout-tasks \
  --address=scout-tasks-ip \
  --tags=http-server,https-server,scout-tasks-api \
  --service-account=scout-tasks-sa@scout-ai-491712.iam.gserviceaccount.com \
  --scopes=https://www.googleapis.com/auth/cloud-platform \
  --metadata=enable-oslogin=TRUE
```

Expected: outputs VM details with `STATUS: RUNNING`.

- [ ] **Step 2: Verify VM exists and is reachable**

Run:
```bash
gcloud compute instances list --filter="name=scout-tasks" \
  --format="table(name,zone.basename(),machineType.basename(),status,networkInterfaces[0].accessConfigs[0].natIP)"
```

Expected: shows `scout-tasks | europe-west1-b | e2-medium | RUNNING | <static IP>` and the IP matches what was reserved in Task 1.

- [ ] **Step 3: SSH in to confirm access**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="uname -a && free -h && df -h /"
```

Expected: outputs Linux kernel info, ~4 GB total memory, ~48 GB free on `/`.

---

## Task 3: Install Docker + clone Supabase self-host

**Files:**
- None local; configures the VM

- [ ] **Step 1: Install Docker on the VM**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  sudo apt-get update && \
  sudo apt-get install -y ca-certificates curl gnupg git && \
  sudo install -m 0755 -d /etc/apt/keyrings && \
  curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
  sudo chmod a+r /etc/apt/keyrings/docker.gpg && \
  echo 'deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable' | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null && \
  sudo apt-get update && \
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin && \
  sudo usermod -aG docker \$USER
"
```

Expected: no errors. `docker` and `docker compose` plugin both installed.

- [ ] **Step 2: Verify Docker works (need fresh SSH session for group membership)**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="docker --version && docker compose version"
```

Expected: prints Docker Engine version (e.g., `Docker version 24.x`) and Docker Compose plugin version (e.g., `Docker Compose version v2.x`).

- [ ] **Step 3: Clone Supabase self-host kit and copy compose files**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  mkdir -p ~/supabase && cd ~/supabase && \
  git clone --depth=1 https://github.com/supabase/supabase.git src && \
  cp -rT src/docker . && \
  ls -la docker-compose.yml .env.example
"
```

Expected: `docker-compose.yml` and `.env.example` exist in `~/supabase/`.

---

## Task 4: Generate secrets + configure docker-compose .env

**Files:**
- Create on VM: `~/supabase/.env`
- Local: `/tmp/scout-tasks-credentials.txt` (downloaded back, kept off git)

- [ ] **Step 1: Generate strong secrets locally and prepare the .env**

On your local machine (NOT on VM yet):
```bash
cat > /tmp/gen-secrets.sh <<'EOF'
#!/bin/bash
set -e
# Postgres password
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 32)
# JWT secret (must be 32+ chars)
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 48)
# Build ANON and SERVICE_ROLE JWTs using the JWT secret
# Use Python jwt library for clean generation
ANON_KEY=$(python3 -c "
import jwt, time
exp = int(time.time()) + 60*60*24*365*5  # 5 years
print(jwt.encode({'role':'anon','iss':'supabase','iat':int(time.time()),'exp':exp}, '$JWT_SECRET', algorithm='HS256'))
")
SERVICE_ROLE_KEY=$(python3 -c "
import jwt, time
exp = int(time.time()) + 60*60*24*365*5
print(jwt.encode({'role':'service_role','iss':'supabase','iat':int(time.time()),'exp':exp}, '$JWT_SECRET', algorithm='HS256'))
")
# Dashboard admin password
DASHBOARD_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)

cat <<ENV
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
ANON_KEY=$ANON_KEY
SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD
SITE_URL=https://work-heyads.ro
ADDITIONAL_REDIRECT_URLS=https://work-heyads.ro,http://localhost:5173
API_EXTERNAL_URL=https://api.work-heyads.ro
SUPABASE_PUBLIC_URL=https://api.work-heyads.ro
ENV
EOF
chmod +x /tmp/gen-secrets.sh
# Ensure python3 has jwt library
pip3 install pyjwt 2>&1 | tail -3 || python3 -m pip install pyjwt --user 2>&1 | tail -3
/tmp/gen-secrets.sh > /tmp/scout-tasks-credentials.txt
cat /tmp/scout-tasks-credentials.txt
```

Expected: prints the env vars including JWT-format ANON_KEY (long base64) and SERVICE_ROLE_KEY. **The `ANON_KEY` value is what the App.jsx will use later.**

- [ ] **Step 2: Push the generated .env to the VM and merge with the example template**

Run:
```bash
gcloud compute scp /tmp/scout-tasks-credentials.txt scout-tasks:~/supabase/.env-overrides --zone=europe-west1-b

gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  cd ~/supabase && \
  cp .env.example .env && \
  # Append/override our values (last assignment wins for docker-compose)
  cat .env-overrides >> .env && \
  rm .env-overrides && \
  # Ensure REALTIME and PostgREST point at the right URL
  echo 'API_EXTERNAL_URL=https://api.work-heyads.ro' >> .env && \
  echo 'SUPABASE_PUBLIC_URL=https://api.work-heyads.ro' >> .env && \
  grep -E '^(POSTGRES_PASSWORD|JWT_SECRET|ANON_KEY|API_EXTERNAL_URL|SUPABASE_PUBLIC_URL)=' .env
"
```

Expected: prints the 5 lines confirming env values are set.

- [ ] **Step 3: Save credentials locally for safekeeping (outside git)**

Run:
```bash
mkdir -p ~/secrets-scout-tasks
cp /tmp/scout-tasks-credentials.txt ~/secrets-scout-tasks/credentials-$(date +%Y%m%d).txt
chmod 600 ~/secrets-scout-tasks/credentials-*.txt
echo "Saved to ~/secrets-scout-tasks/"
ls -la ~/secrets-scout-tasks/
```

Expected: credentials file with 600 perms in `~/secrets-scout-tasks/`. **Do NOT commit this to git.**

---

## Task 5: Start the Supabase stack + verify containers healthy

**Files:**
- None (just running docker compose)

- [ ] **Step 1: Pull all Supabase images**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  cd ~/supabase && docker compose pull
"
```

Expected: all images pulled (postgres, postgrest, gotrue, realtime, kong, studio, etc.).

- [ ] **Step 2: Start the stack**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  cd ~/supabase && docker compose up -d
"
```

Expected: containers come up. Print output ends with `Started` for each service.

- [ ] **Step 3: Wait 60 seconds for all services to settle, then verify health**

Run:
```bash
sleep 60
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  cd ~/supabase && docker compose ps --format 'table {{.Service}}\t{{.Status}}'
"
```

Expected: all services show `running` or `healthy`. If any are `unhealthy`, check `docker compose logs <service>` for the issue before proceeding.

- [ ] **Step 4: Smoke-test PostgREST inside the VM (no TLS yet)**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  curl -s http://localhost:8000/rest/v1/ -H 'apikey: \$(grep ^ANON_KEY ~/supabase/.env | cut -d= -f2-)' | head -c 200
"
```

Expected: returns JSON describing the OpenAPI schema (or at minimum `{}` rather than a connection error).

---

## Task 6: Configure nginx + TLS for api.work-heyads.ro

**Files:**
- Create on VM: `/etc/nginx/sites-available/api.work-heyads.ro`

- [ ] **Step 1: Add the DNS A record manually**

User action — log into the DNS provider hosting `work-heyads.ro` and add:
```
Type: A
Name: api
Value: <the static IP from Task 1 step 1>
TTL: 300
```

Verify from the local machine:
```bash
dig +short api.work-heyads.ro
```

Expected: resolves to the static IP. May take 1-5 minutes for propagation.

- [ ] **Step 2: Install nginx + certbot on the VM**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  sudo apt-get install -y nginx certbot python3-certbot-nginx
"
```

Expected: installs cleanly.

- [ ] **Step 3: Create nginx config for api.work-heyads.ro**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="sudo tee /etc/nginx/sites-available/api.work-heyads.ro > /dev/null <<'NGINX'
server {
    listen 80;
    server_name api.work-heyads.ro;

    # Allow Let's Encrypt HTTP-01 challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.work-heyads.ro;

    # Cert paths populated by certbot in next step (placeholder before run)
    ssl_certificate /etc/letsencrypt/live/api.work-heyads.ro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.work-heyads.ro/privkey.pem;

    client_max_body_size 50M;

    # PostgREST + Auth via Kong gateway (Supabase's compose maps Kong to :8000)
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Realtime WebSocket (separate location to enable Upgrade headers)
    location /realtime/v1/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;  # 24h — keep WS connections alive
    }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/api.work-heyads.ro /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
"
```

Expected: creates the config file and the symlink in `sites-enabled`.

- [ ] **Step 4: Temporarily comment out the SSL lines and reload nginx for HTTP-01 challenge**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  sudo sed -i 's|listen 443 ssl http2;|listen 443 ssl http2 default_server;|' /etc/nginx/sites-available/api.work-heyads.ro && \
  # Replace the server block to remove SSL temporarily
  sudo cp /etc/nginx/sites-available/api.work-heyads.ro /etc/nginx/sites-available/api.work-heyads.ro.bak && \
  sudo bash -c 'cat > /etc/nginx/sites-available/api.work-heyads.ro' <<'NGINX'
server {
    listen 80;
    server_name api.work-heyads.ro;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 200 'tls pending';
    }
}
NGINX
  sudo nginx -t && sudo systemctl reload nginx
"
```

Expected: `nginx -t` passes (`syntax is ok` and `test is successful`), then `reload nginx` returns silently.

- [ ] **Step 5: Run certbot to obtain a Let's Encrypt cert**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  sudo certbot --nginx -d api.work-heyads.ro \
    --non-interactive --agree-tos -m peltea.bogdann@gmail.com \
    --redirect
"
```

Expected: outputs `Successfully received certificate.` and `Successfully deployed certificate`. Nginx config is automatically updated to use the cert.

- [ ] **Step 6: Restore the full proxy config (now with cert paths populated by certbot)**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  sudo cp /etc/nginx/sites-available/api.work-heyads.ro.bak /etc/nginx/sites-available/api.work-heyads.ro && \
  sudo nginx -t && sudo systemctl reload nginx
"
```

Expected: `nginx -t` passes.

- [ ] **Step 7: Verify HTTPS works end-to-end**

Run:
```bash
curl -sI https://api.work-heyads.ro/rest/v1/ -H "apikey: $(grep ^ANON_KEY ~/secrets-scout-tasks/credentials-*.txt | cut -d= -f2-)" | head -3
```

Expected: HTTP/2 200 OK (or 200 with appropriate body). TLS cert valid.

---

## Task 7: Configure Postgres for realtime (`wal_level=logical`, publication, replica identity)

**Files:**
- None on local; SQL run inside Postgres container.

- [ ] **Step 1: Verify `wal_level` is `logical`** (Supabase self-host sets this by default; verify)

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  cd ~/supabase && \
  docker compose exec -T db psql -U postgres -c 'SHOW wal_level;'
"
```

Expected: returns `wal_level` row with value `logical`. If `replica` or `minimal`, edit `volumes/db/postgresql.conf` and restart Postgres.

- [ ] **Step 2: Create `app_data` table schema**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  cd ~/supabase && \
  docker compose exec -T db psql -U postgres -d postgres <<SQL
CREATE TABLE IF NOT EXISTS public.app_data (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_data ENABLE ROW LEVEL SECURITY;
-- Permissive policy: anon can do everything (matches current Supabase Cloud config)
DROP POLICY IF EXISTS app_data_anon_all ON public.app_data;
CREATE POLICY app_data_anon_all ON public.app_data
  FOR ALL TO anon
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS app_data_authenticated_all ON public.app_data;
CREATE POLICY app_data_authenticated_all ON public.app_data
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
ALTER TABLE public.app_data REPLICA IDENTITY FULL;
GRANT ALL ON public.app_data TO anon, authenticated, service_role;
SQL
"
```

Expected: outputs `CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY` (×2), `ALTER TABLE` (replica identity), `GRANT`. No errors.

- [ ] **Step 3: Create the `supabase_realtime` publication for `app_data`**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  cd ~/supabase && \
  docker compose exec -T db psql -U postgres -d postgres <<SQL
-- Supabase self-host creates this publication automatically. Add app_data to it.
DO \\\$\\\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE public.app_data;
  ELSE
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_data;
  END IF;
END
\\\$\\\$;
SELECT pubname, schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
SQL
"
```

Expected: prints a row showing `supabase_realtime | public | app_data`.

- [ ] **Step 4: Verify Realtime container picked up the publication**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  cd ~/supabase && docker compose logs realtime --tail=20 | grep -i 'app_data\|subscribed\|publication' || echo 'no recent app_data activity (expected — empty table)'
"
```

Expected: no errors in Realtime logs. (Empty result is fine; Realtime ingests events lazily on subscription.)

---

## Task 8: Export data from Supabase + import into new Postgres

**Files:**
- Create local: `/tmp/migration/<rowname>.csv` (one per row id)

- [ ] **Step 1: Open Supabase dashboard SQL Editor**

User action: log into `https://supabase.com/dashboard/project/ploucecgizjwyumzmhmo/sql/new`.

Run this query in the SQL Editor:
```sql
SELECT id, data, updated_at FROM app_data ORDER BY id;
```

In the result panel, click **"Download CSV"**.

Save the file as `/tmp/migration/app_data.csv` on your local machine.

Expected: CSV file with ~3,000+ rows (2,981 task_* rows + ~20 config blobs + backup rows).

- [ ] **Step 2: Inspect the CSV format to confirm column names**

Run:
```bash
head -2 /tmp/migration/app_data.csv
wc -l /tmp/migration/app_data.csv
```

Expected: header row `id,data,updated_at` (or with quoting). Total row count ≥ 3,000.

- [ ] **Step 3: SCP CSV to the VM**

Run:
```bash
gcloud compute scp /tmp/migration/app_data.csv scout-tasks:/tmp/app_data.csv --zone=europe-west1-b
```

Expected: file transferred.

- [ ] **Step 4: Import CSV via psql `\copy`**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="
  # Copy the file inside the postgres container
  docker cp /tmp/app_data.csv supabase-db:/tmp/app_data.csv && \
  # Import. The CSV has a header; data column contains JSON, updated_at is timestamptz.
  docker compose -f ~/supabase/docker-compose.yml exec -T db psql -U postgres -d postgres <<SQL
TRUNCATE public.app_data;
\\\\copy public.app_data(id, data, updated_at) FROM '/tmp/app_data.csv' WITH (FORMAT csv, HEADER true);
SELECT count(*) AS total_rows FROM public.app_data;
SELECT count(*) AS task_rows FROM public.app_data WHERE id LIKE 'task\\_%' ESCAPE '\\\\';
SELECT count(*) AS backup_rows FROM public.app_data WHERE id LIKE 'tasks_backup%';
SQL
"
```

Expected: prints `total_rows` (≥3,000), `task_rows` (≥2,981), `backup_rows` (≥4).

- [ ] **Step 5: Verify the row counts match what was in Supabase pre-migration**

In the Supabase SQL Editor (still working), run:
```sql
SELECT
  (SELECT count(*) FROM app_data) AS total,
  (SELECT count(*) FROM app_data WHERE id LIKE 'task\_%' ESCAPE '\\') AS tasks,
  (SELECT count(*) FROM app_data WHERE id LIKE 'tasks_backup%') AS backups;
```

Compare totals. Expected: equal in both places. If a mismatch, investigate the diff before proceeding.

- [ ] **Step 6: Spot-check a known row via the new PostgREST endpoint**

Run:
```bash
ANON_KEY=$(grep ^ANON_KEY ~/secrets-scout-tasks/credentials-*.txt | cut -d= -f2-)
curl -s "https://api.work-heyads.ro/rest/v1/app_data?id=eq.team&select=data" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | head -c 500
```

Expected: returns JSON with the `team` row including all users (admin, mara, carla, dana, etc.).

---

## Task 9: Update App.jsx to point at api.work-heyads.ro

**Files:**
- Modify: `src/App.jsx` (5 locations: 4 URLs + 1 anon key, plus the supabase-js client constructor call)

- [ ] **Step 1: Get the new ANON_KEY value**

Run:
```bash
grep ^ANON_KEY ~/secrets-scout-tasks/credentials-*.txt | cut -d= -f2-
```

Copy the output. It will be a long JWT string starting with `eyJ...`.

- [ ] **Step 2: Replace the Supabase URL globally**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager
sed -i.bak 's|https://ploucecgizjwyumzmhmo.supabase.co|https://api.work-heyads.ro|g' src/App.jsx
grep -c "api.work-heyads.ro" src/App.jsx
grep -c "ploucecgizjwyumzmhmo" src/App.jsx
```

Expected: prints ~4-5 (number of URL replacements) and `0` (no remaining old URL references).

- [ ] **Step 3: Replace the ANON key globally**

Set the new key as a variable in your shell, then run:
```bash
NEW_ANON_KEY="<paste the JWT from step 1>"
cd /Users/bogdanpeltea/Desktop/scout-task-manager
sed -i.bak2 "s|sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh|$NEW_ANON_KEY|g" src/App.jsx
grep -c "$NEW_ANON_KEY" src/App.jsx
grep -c "sb_publishable_FoAoSy7d" src/App.jsx
```

Expected: prints ~5-8 (occurrences of the new key) and `0` (no old key references).

- [ ] **Step 4: Build and verify the bundle compiles**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager
npm run build 2>&1 | tail -5
```

Expected: `✓ built in <time>s` with no errors.

- [ ] **Step 5: Remove backup files and commit**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager
rm -f src/App.jsx.bak src/App.jsx.bak2
git add src/App.jsx
git commit -m "Migrate backend to self-hosted Supabase on GCP

Swap all 4 hardcoded Supabase Cloud URLs to api.work-heyads.ro and update
the anon key from publishable format to JWT format generated by the
self-host stack. Same API surface — no behavioral change.

Backend: GCP VM scout-tasks (e2-medium, europe-west1-b), running official
Supabase docker-compose. Migrated from Supabase Cloud after the org hit
egress quota.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

Expected: commit created. (Don't push yet — see Task 10.)

---

## Task 10: Deploy + smoke-test + cutover

**Files:**
- None new

- [ ] **Step 1: Push to main → Vercel auto-deploy**

Run:
```bash
cd /Users/bogdanpeltea/Desktop/scout-task-manager
git push origin main
```

Expected: push succeeds. Vercel deploy starts within 30 seconds.

- [ ] **Step 2: Wait for Vercel deploy + identify new bundle hash**

Run (in a loop):
```bash
OLD_BUNDLE=$(curl -s "https://work-heyads.ro/" | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1)
echo "Current bundle: $OLD_BUNDLE"
while true; do
  CUR=$(curl -s "https://work-heyads.ro/?_v=$(date +%s)" -H "Cache-Control: no-cache" 2>/dev/null | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1)
  if [ -n "$CUR" ] && [ "$CUR" != "$OLD_BUNDLE" ]; then
    echo "DEPLOYED: $CUR"
    break
  fi
  sleep 15
done
```

Expected: bundle hash changes within 1-3 minutes.

- [ ] **Step 3: Smoke-test the platform — login as admin**

Use Playwright (or manually). Navigate to `https://work-heyads.ro/?_v=migration_verify`. Log in as `admin / papagal18`.

Expected: login succeeds, dashboard renders with task counts > 0. If login fails with "username sau parola gresita", the `team` row didn't load → check Task 8 import.

- [ ] **Step 4: Verify task list loads (per-row)**

In the browser console:
```js
JSON.parse(localStorage.getItem('s7_tasks')).length
```

Expected: ~2,981 (matches pre-migration per-row task count).

- [ ] **Step 5: Smoke-test create + status change + realtime**

Manually OR via Playwright:
1. Click "New Task". Title: `MIGRATION_VERIFY_DELETE_ME`. Assignee: Dana. Type: Creative video.
2. Submit.
3. Mark the task **In Progress** → wait 5s → mark **Done**.
4. Refresh page. Confirm task still shows as Done.

Then check Supabase write hit per-row:
```bash
ANON_KEY=<your new key>
curl -s "https://api.work-heyads.ro/rest/v1/app_data?id=like.task_%25&select=id,data&data->>title=eq.MIGRATION_VERIFY_DELETE_ME" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
```

Expected: returns one row with status=Done, statusAt set.

- [ ] **Step 6: Smoke-test the pipeline chain**

Manually: create a Dana task with `_pipelineNext: mara_poze`. Mark Dana's task Done. Expected: a Mara Poze "Foto Produs" task appears within 5 seconds. Mark that Done. An Alexandra "Landing Page" task appears. Mark that Done. An Alexandra "Ads Creation" task appears. Chain stops.

If any step fails, pipeline rules didn't migrate correctly — check Task 8 verification.

- [ ] **Step 7: Cleanup the test task**

Run:
```bash
ANON_KEY=<your new key>
TASK_ID=$(curl -s "https://api.work-heyads.ro/rest/v1/app_data?id=like.task_%25&select=id&data->>title=eq.MIGRATION_VERIFY_DELETE_ME" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
echo "Deleting $TASK_ID"
curl -s -X DELETE "https://api.work-heyads.ro/rest/v1/app_data?id=eq.$TASK_ID" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" -o /dev/null -w "HTTP %{http_code}\n"
```

Expected: `HTTP 204`. Also delete any pipeline children spawned during step 6 (same pattern with their IDs).

- [ ] **Step 8: Notify the team**

Send Carla a short message:
> "Platforma e mutată pe infrastructură proprie. Faceți **Ctrl+Shift+R** o dată în browser ca să primiți noua versiune. Totul funcționează la fel ca înainte; URL-ul rămâne work-heyads.ro."

- [ ] **Step 9: Update Supabase project: pause or downgrade to free**

User action — log into Supabase, navigate to project `ploucecgizjwyumzmhmo` → Settings → General → **Pause project** (or **delete** if you're confident the migration is solid and don't want any chance of being billed further).

Expected: project paused. No further egress consumption.

---

## Task 11: Backup automation

**Files:**
- Create on VM: `/usr/local/bin/scout-tasks-backup.sh`
- Create on VM: `/etc/cron.d/scout-tasks-backup`

- [ ] **Step 1: Write the backup script on the VM**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="sudo tee /usr/local/bin/scout-tasks-backup.sh > /dev/null <<'BASH'
#!/bin/bash
set -e
DATE=\$(date +%Y-%m-%d-%H%M)
TMPFILE=/tmp/scout-tasks-pg-\$DATE.sql.gz
cd /home/\$(ls /home | head -1)/supabase
docker compose exec -T db pg_dump -U postgres -d postgres --no-owner --no-privileges | gzip > \$TMPFILE
gsutil cp \$TMPFILE gs://scout-ai-491712-tasks-backups/
rm -f \$TMPFILE
echo \"\$(date -Iseconds) backup uploaded\" >> /var/log/scout-tasks-backup.log
BASH
sudo chmod +x /usr/local/bin/scout-tasks-backup.sh
"
```

Expected: script created.

- [ ] **Step 2: Run the backup manually once to verify it works**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="sudo /usr/local/bin/scout-tasks-backup.sh && cat /var/log/scout-tasks-backup.log"
```

Expected: backup completes, log line written. `gsutil ls gs://scout-ai-491712-tasks-backups/` shows the new file.

- [ ] **Step 3: Add daily cron entry at 03:00 UTC**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="echo '0 3 * * * root /usr/local/bin/scout-tasks-backup.sh' | sudo tee /etc/cron.d/scout-tasks-backup"
```

Expected: cron job entry created. `crontab -l` won't show it (it's in /etc/cron.d/), but `sudo cat /etc/cron.d/scout-tasks-backup` will.

- [ ] **Step 4: Verify cron syntax is valid**

Run:
```bash
gcloud compute ssh scout-tasks --zone=europe-west1-b --command="sudo crontab -u root -l 2>&1 | head -3; sudo systemctl status cron | head -3"
```

Expected: cron daemon `active (running)`.

---

## Self-Review Checklist

- [x] **Spec coverage:** Tasks 1-2 (infrastructure), 3-5 (stack), 6 (TLS), 7 (DB config), 8 (data migration), 9-10 (app cutover), 11 (backups). Spec's success criteria mapped to specific verification steps.
- [x] **Placeholders:** No "TBD", "TODO", or vague text. Every step has concrete commands and expected output.
- [x] **Type/name consistency:** VM name `scout-tasks`, service account `scout-tasks-sa@...`, firewall tag `scout-tasks-api`, IP name `scout-tasks-ip`, bucket `scout-ai-491712-tasks-backups`, subdomain `api.work-heyads.ro`. All used consistently across tasks.
- [x] **Rollback paths:** Spec's rollback section covers (a) pre-commit, (b) pre-user-impact, (c) post-cutover. Plan Task 10 step 9 is the final irreversible step (pausing Supabase); everything before is reversible.
- [x] **Side-effects logged:** Each task that modifies prod state (Tasks 8, 9, 10) has a verification step immediately after.
