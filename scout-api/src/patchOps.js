// PATCH op vocabulary — set_field, delete_field, array_append, array_remove, array_update.
// All ops are pure: they take (data, op) and return new data. The caller does the version check.

function getAtPath(obj, path) {
  let cur = obj;
  for (const p of path) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setAtPath(obj, path, value) {
  if (path.length === 0) return value;
  const out = Array.isArray(obj) ? obj.slice() : Object.assign({}, obj);
  let cur = out;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
    else cur[k] = Array.isArray(cur[k]) ? cur[k].slice() : Object.assign({}, cur[k]);
    cur = cur[k];
  }
  cur[path[path.length - 1]] = value;
  return out;
}

function deleteAtPath(obj, path) {
  if (path.length === 0) return obj;
  const out = Array.isArray(obj) ? obj.slice() : Object.assign({}, obj);
  let cur = out;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (cur[k] == null) return out;
    cur[k] = Array.isArray(cur[k]) ? cur[k].slice() : Object.assign({}, cur[k]);
    cur = cur[k];
  }
  delete cur[path[path.length - 1]];
  return out;
}

export function applyOp(data, op) {
  const { op: kind, path = [], value, max, where, patch } = op;
  const baseObj = data == null ? {} : data;
  switch (kind) {
    case "set_field":
      return setAtPath(baseObj, path, value);
    case "delete_field":
      return deleteAtPath(baseObj, path);
    case "array_append": {
      const arr = getAtPath(baseObj, path);
      const base = Array.isArray(arr) ? arr.slice() : [];
      base.push(value);
      const trimmed = max && base.length > max ? base.slice(-max) : base;
      return setAtPath(baseObj, path, trimmed);
    }
    case "array_remove": {
      const arr = getAtPath(baseObj, path);
      if (!Array.isArray(arr)) return baseObj;
      const filtered = arr.filter((it) => !(it && it[where.field] === where.eq));
      return setAtPath(baseObj, path, filtered);
    }
    case "array_update": {
      const arr = getAtPath(baseObj, path);
      if (!Array.isArray(arr)) return baseObj;
      const updated = arr.map((it) =>
        it && it[where.field] === where.eq ? Object.assign({}, it, patch) : it
      );
      return setAtPath(baseObj, path, updated);
    }
    default:
      throw new Error(`unknown_op:${kind}`);
  }
}
