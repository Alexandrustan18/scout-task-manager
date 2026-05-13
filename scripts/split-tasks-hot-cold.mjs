#!/usr/bin/env node
// Migration: split tasks JSONB blob into hot/cold based on recency (count-based).
// Hot = all non-Done + last 500 Done by updatedAt. Cold = everything else.
// USAGE:
//   node scripts/split-tasks-hot-cold.mjs           # dry run, no writes
//   node scripts/split-tasks-hot-cold.mjs --commit  # actually writes

import https from "https";

const URL = "ploucecgizjwyumzmhmo.supabase.co";
const KEY = "sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh";
const HOT_DONE_KEEP = 500;

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: URL, path, method,
      headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", Prefer: "return=representation" },
    }, (res) => {
      let buf = ""; res.on("data", (d) => (buf += d));
      res.on("end", () => resolve({ status: res.statusCode, body: buf }));
    });
    r.on("error", reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const get = await req("GET", "/rest/v1/app_data?id=eq.tasks&select=data", null);
const all = JSON.parse(get.body)[0].data;
console.log("Total tasks (incl tombstones):", all.length);

const tombstones = all.filter((t) => t && t._deleted);
const notDone = all.filter((t) => t && !t._deleted && t.status !== "Done");
const doneSorted = all
  .filter((t) => t && !t._deleted && t.status === "Done")
  .sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  });
const hotDone = doneSorted.slice(0, HOT_DONE_KEEP);
const coldDone = doneSorted.slice(HOT_DONE_KEEP);

const hot = [].concat(tombstones, notDone, hotDone);
const cold = coldDone;

const hotBytes = Buffer.byteLength(JSON.stringify(hot));
const coldBytes = Buffer.byteLength(JSON.stringify(cold));
const totalBytes = Buffer.byteLength(JSON.stringify(all));

console.log("");
console.log("Split:");
console.log("  Tombstones (kept in hot):", tombstones.length);
console.log("  Not-Done (kept in hot):  ", notDone.length);
console.log("  Done in hot (newest 500):", hotDone.length);
console.log("  Done in cold:            ", coldDone.length);
console.log("");
console.log("Payload sizes:");
console.log("  Hot:  ", hot.length, "tasks =", Math.round(hotBytes / 1024), "KB");
console.log("  Cold: ", cold.length, "tasks =", Math.round(coldBytes / 1024), "KB");
console.log("  Total:", all.length, "tasks =", Math.round(totalBytes / 1024), "KB");
console.log("");
console.log("Reduction: hot writes will be " + Math.round((hotBytes / totalBytes) * 100) + "% of current payload");
console.log("  -> from ~" + Math.round(totalBytes / 1024) + " KB per save to ~" + Math.round(hotBytes / 1024) + " KB per save");

if (!process.argv.includes("--commit")) {
  console.log("\n[DRY RUN] Pass --commit to write changes.");
  process.exit(0);
}

console.log("\n[COMMIT MODE] Writing changes...");

// Create backup first
const backupId = "tasks_backup_" + new Date().toISOString().replace(/[:.]/g, "-");
console.log("Creating backup row:", backupId);
const bw = await req("POST", "/rest/v1/app_data", { id: backupId, data: all });
if (bw.status >= 400) {
  console.error("Backup failed!", bw.status, bw.body);
  process.exit(1);
}
console.log("  Backup OK, status:", bw.status);

// Write hot (overwrites id=tasks)
console.log("Writing hot to id=tasks...");
const hw = await req("PATCH", "/rest/v1/app_data?id=eq.tasks", { data: hot });
if (hw.status >= 400) {
  console.error("Hot write failed!", hw.status, hw.body);
  console.error("Backup is at id=" + backupId);
  process.exit(1);
}
console.log("  Hot write OK, status:", hw.status);

// Write cold (upsert to id=tasks_archive)
console.log("Writing cold to id=tasks_archive...");
const cw = await req("POST", "/rest/v1/app_data?on_conflict=id", { id: "tasks_archive", data: cold });
if (cw.status >= 400) {
  console.error("Cold write failed!", cw.status, cw.body);
  console.error("Backup is at id=" + backupId);
  process.exit(1);
}
console.log("  Cold write OK, status:", cw.status);

console.log("\n✓ Migration complete.");
console.log("  Backup at id=" + backupId);
console.log("  Hot:  id=tasks (" + hot.length + " tasks)");
console.log("  Cold: id=tasks_archive (" + cold.length + " tasks)");
