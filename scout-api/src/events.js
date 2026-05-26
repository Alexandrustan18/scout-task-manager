import { authPreHandler, verifyToken } from "./auth.js";

const RING_SIZE = 5000;
const ring = new Array(RING_SIZE).fill(null); // {id, event, dataStr}
let ringHead = 0;          // next write index
let lastEventId = 0;
globalThis._scoutLastEventId = 0;

const clients = new Set(); // { res, tabId, username }

function ringPush(entry) {
  ring[ringHead] = entry;
  ringHead = (ringHead + 1) % RING_SIZE;
}

function ringEntriesAfter(afterId) {
  // walk from oldest to newest
  const out = [];
  for (let i = 0; i < RING_SIZE; i++) {
    const idx = (ringHead + i) % RING_SIZE;
    const e = ring[idx];
    if (e && e.id > afterId) out.push(e);
  }
  return out;
}

export function broadcast(payload) {
  lastEventId += 1;
  globalThis._scoutLastEventId = lastEventId;
  const entry = {
    id: lastEventId,
    event: payload.type,
    dataStr: JSON.stringify({ ...payload, eventId: lastEventId }),
  };
  ringPush(entry);
  const line = `id: ${entry.id}\nevent: ${entry.event}\ndata: ${entry.dataStr}\n\n`;
  for (const c of clients) {
    try { c.res.raw.write(line); } catch {}
  }
}

export function registerEventsRoutes(app) {
  app.get("/api/events", async (req, reply) => {
    // Auth via query (?token=) OR header (EventSource can't set headers)
    const token = req.query.token || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);
    if (!token) return reply.code(401).send({ error: "no_token" });
    let payload;
    try { payload = await verifyToken(token); } catch { return reply.code(401).send({ error: "invalid_token" }); }
    const tabId = req.query.tab || "no-tab";
    const username = payload.sub;

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // Replay
    const lastIdHeader = parseInt(req.headers["last-event-id"] || "0", 10);
    if (lastIdHeader > 0) {
      const missed = ringEntriesAfter(lastIdHeader);
      const oldestInRing = ring.find((e) => e !== null);
      if (missed.length === 0 && oldestInRing && oldestInRing.id > lastIdHeader) {
        // gap beyond ring → full resync
        reply.raw.write(`id: ${lastEventId}\nevent: full_resync\ndata: {}\n\n`);
      } else {
        for (const e of missed) {
          reply.raw.write(`id: ${e.id}\nevent: ${e.event}\ndata: ${e.dataStr}\n\n`);
        }
      }
    } else {
      reply.raw.write(`id: ${lastEventId}\nevent: hello\ndata: ${JSON.stringify({ lastEventId, serverTime: new Date().toISOString() })}\n\n`);
    }

    // Heartbeat ping every 25s to keep proxies happy
    const ping = setInterval(() => {
      try { reply.raw.write(`: ping\n\n`); } catch {}
    }, 25000);

    const client = { res: reply, tabId, username };
    clients.add(client);

    req.raw.on("close", () => {
      clearInterval(ping);
      clients.delete(client);
    });

    // Fastify needs us to "hijack" the response so it doesn't try to send any reply itself
    return reply;
  });
}

export function sseStats() {
  return { clients: clients.size, lastEventId };
}
