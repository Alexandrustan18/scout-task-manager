import { pool, getRow, upsertWithVersion } from "./db.js";
import { authPreHandler } from "./auth.js";

export function registerTaskRoutes(app, broadcast) {
  app.post("/api/tasks", { preHandler: authPreHandler }, async (req, reply) => {
    const taskData = req.body?.data;
    if (!taskData || !taskData.id) return reply.code(400).send({ error: "data.id required" });
    const rowId = "task_" + taskData.id;
    const v = await upsertWithVersion({
      id: rowId,
      data: taskData,
      expectedVersion: 0,
      updatedBy: req.user.username,
    });
    if (v == null) return reply.code(409).send({ error: "exists" });
    broadcast({ type: "task_change", rowId, id: taskData.id, data: taskData, version: v, by: req.user.username, tabId: req.tabId });
    return { id: taskData.id, version: v };
  });

  app.put("/api/tasks/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const { data, version } = req.body || {};
    if (typeof version !== "number" || !data) return reply.code(400).send({ error: "bad_body" });
    if (data.id !== req.params.id) return reply.code(400).send({ error: "id_mismatch" });
    const rowId = "task_" + req.params.id;
    const v = await upsertWithVersion({
      id: rowId,
      data,
      expectedVersion: version,
      updatedBy: req.user.username,
    });
    if (v == null) {
      const cur = await getRow(rowId);
      return reply.code(409).send({ error: "version_conflict", currentVersion: cur?.version ?? 0, currentData: cur?.data ?? null });
    }
    broadcast({ type: "task_change", rowId, id: req.params.id, data, version: v, by: req.user.username, tabId: req.tabId });
    return { version: v };
  });

  app.delete("/api/tasks/:id", { preHandler: authPreHandler }, async (req, reply) => {
    const { version } = req.body || {};
    if (typeof version !== "number") return reply.code(400).send({ error: "version_required" });
    const rowId = "task_" + req.params.id;
    const cur = await getRow(rowId);
    if (!cur) return reply.code(404).send({ error: "not_found" });
    const newData = Object.assign({}, cur.data, { _deleted: true });
    const v = await upsertWithVersion({
      id: rowId,
      data: newData,
      expectedVersion: version,
      updatedBy: req.user.username,
    });
    if (v == null) return reply.code(409).send({ error: "version_conflict", currentVersion: cur.version, currentData: cur.data });
    broadcast({ type: "task_change", rowId, id: req.params.id, data: newData, version: v, by: req.user.username, tabId: req.tabId });
    return { version: v, ok: true };
  });
}
