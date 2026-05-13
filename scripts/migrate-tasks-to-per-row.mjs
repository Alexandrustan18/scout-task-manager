#!/usr/bin/env node
// Migration: convert tasks JSONB blob (id=tasks + id=tasks_archive) into per-row format.
// Each task becomes its own app_data row with id="task_<taskId>" and data=<task object>.
// Old id=tasks and id=tasks_archive rows are PRESERVED untouched (additional backup).
// USAGE:
//   node scripts/migrate-tasks-to-per-row.mjs           # dry run
//   node scripts/migrate-tasks-to-per-row.mjs --commit  # actual write

import https from "https";

const URL = "ploucecgizjwyumzmhmo.supabase.co";
const KEY = "sb_publishable_FoAoSy7d052B3oVbcxiuyg_iLlTLiSh";
const BATCH = 50;

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

// Read existing
const hotR = await req("GET", "/rest/v1/app_data?id=eq.tasks&select=data", null);
const coldR = await req("GET", "/rest/v1/app_data?id=eq.tasks_archive&select=data", null);
const hot = (JSON.parse(hotR.body)[0] || { data: [] }).data || [];
const cold = (JSON.parse(coldR.body)[0] || { data: [] }).data || [];
console.log("Hot:", hot.length, "Cold:", cold.length);

// Union, dedupe by id (last writer wins, prefer hot)
const byId = {};
for (const t of cold) if (t && t.id) byId[t.id] = t;
for (const t of hot) if (t && t.id) byId[t.id] = t; // hot overrides cold
const allTasks = Object.values(byId);
console.log("Unique tasks to migrate:", allTasks.length);

// Validate every task has an id
const missing = allTasks.filter((t) => !t.id);
if (missing.length > 0) {
  console.error("ABORT: " + missing.length + " tasks missing id");
  process.exit(1);
}

// Estimate sizes
let totalBytes = 0;
let maxRow = 0;
for (const t of allTasks) {
  const b = Buffer.byteLength(JSON.stringify(t));
  totalBytes += b;
  if (b > maxRow) maxRow = b;
}
console.log("Total payload across all rows:", Math.round(totalBytes / 1024), "KB");
console.log("Largest single task:", Math.round(maxRow / 1024), "KB");
console.log("Avg per task:", Math.round(totalBytes / allTasks.length), "bytes");

if (!process.argv.includes("--commit")) {
  console.log("\n[DRY RUN] Pass --commit to write.");
  process.exit(0);
}

console.log("\n[COMMIT MODE] Writing " + allTasks.length + " per-task rows in batches of " + BATCH + "...");

// Write in batches via POST with onConflict resolution
let written = 0;
let failed = 0;
for (let i = 0; i < allTasks.length; i += BATCH) {
  const slice = allTasks.slice(i, i + BATCH);
  const rows = slice.map((t) => ({ id: "task_" + t.id, data: t }));
  const w = await req("POST", "/rest/v1/app_data?on_conflict=id", rows);
  // Prefer header to merge-on-conflict isn't honored without a special header — use it
  if (w.status === 201 || w.status === 200) {
    written += slice.length;
    if (i % 500 === 0) console.log("  Written " + written + "/" + allTasks.length);
  } else {
    failed += slice.length;
    console.error("  Batch failed at offset " + i + ":", w.status, w.body.slice(0, 200));
  }
}
console.log("");
console.log("Written: " + written + " / " + allTasks.length);
if (failed > 0) console.log("FAILED: " + failed);

// Verify by counting back
const headers = { apikey: KEY, Authorization: "Bearer " + KEY };
const verify = await new Promise((resolve, reject) => {
  https.get({
    hostname: URL,
    path: "/rest/v1/app_data?id=like.task_*&select=id",
    headers: Object.assign({}, headers, { Prefer: "count=exact", Range: "0-0" }),
  }, (res) => {
    let buf = ""; res.on("data", (d) => (buf += d));
    res.on("end", () => resolve({ headers: res.headers, body: buf }));
  }).on("error", reject);
});
const contentRange = verify.headers["content-range"];
console.log("\nVerification count from Supabase:", contentRange);
