import { SignJWT, jwtVerify } from "jose";
import { readFileSync } from "node:fs";
import { getRow } from "./db.js";

function loadSecret() {
  if (process.env.JWT_SECRET_FILE) {
    try { return readFileSync(process.env.JWT_SECRET_FILE, "utf8").trim(); } catch {}
  }
  return process.env.JWT_SECRET || "dev-secret-change-me";
}
const SECRET = new TextEncoder().encode(loadSecret());
const TOKEN_TTL_HOURS = 12;

export async function signToken({ username, role }) {
  return await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_HOURS}h`)
    .sign(SECRET);
}

export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, SECRET);
  return payload;
}

export async function authPreHandler(req, reply) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    reply.code(401).send({ error: "no_token" });
    return;
  }
  try {
    const payload = await verifyToken(token);
    req.user = { username: payload.sub, role: payload.role };
    req.tabId = req.headers["x-scout-tab-id"] || "no-tab";
  } catch {
    reply.code(401).send({ error: "invalid_token" });
  }
}

export function registerAuthRoutes(app) {
  app.post("/api/login", {
    schema: {
      body: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string" },
          password: { type: "string" },
        },
      },
    },
  }, async (req, reply) => {
    let { username, password } = req.body;
    // Trim + case-insensitive lookup — protects against mobile keyboards that
    // add trailing space or auto-capitalize the first letter.
    username = (username || "").trim();
    const teamRow = await getRow("team");
    if (!teamRow) return reply.code(500).send({ error: "no_team_row" });
    const team = teamRow.data || {};
    let user = team[username];
    let canonicalUsername = username;
    if (!user) {
      // Fallback: match ignoring case
      const key = Object.keys(team).find((k) => k.toLowerCase() === username.toLowerCase());
      if (key) { user = team[key]; canonicalUsername = key; }
    }
    if (!user) return reply.code(401).send({ error: "bad_credentials" });
    if (user.password !== password) return reply.code(401).send({ error: "bad_credentials" });
    const token = await signToken({ username: canonicalUsername, role: user.role });
    username = canonicalUsername;
    // Return only public fields
    const publicUser = {
      username,
      name: user.name,
      role: user.role,
      color: user.color,
      access: user.access,
      team: user.team,
      pm: user.pm,
      assignableBy: user.assignableBy,
    };
    return { token, user: publicUser, serverTime: new Date().toISOString() };
  });

  app.get("/api/me", { preHandler: authPreHandler }, async (req) => {
    const teamRow = await getRow("team");
    const u = (teamRow?.data || {})[req.user.username] || {};
    return {
      user: {
        username: req.user.username,
        name: u.name,
        role: u.role,
        color: u.color,
      },
      serverTime: new Date().toISOString(),
    };
  });
}
