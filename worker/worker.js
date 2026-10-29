// CNAP Phase S hub: relay between the website and Smartsheet.
// The Smartsheet token lives here as a secret, never in the website.
//
// GET  /progress              status counts for the Dashboard (no passcode)
// GET  /tasks                 every assignment row (needs the team passcode)
// POST /tasks/<rowId>         {"progress": "<status>"} sets one row's Progress (needs the passcode)
//
// Secrets (set with `wrangler secret put`): SMARTSHEET_TOKEN, TEAM_PASSCODE
// Vars (wrangler.toml): SHEET_ID, ALLOWED_ORIGINS

const STATUSES = ["Not Started", "In Progress", "Ready for Review", "Applying Reviewer Feedback", "Finalized"];
const COLS = {
  progress: "Progress",
  section: "Proposal Section",
  responsible: "Responsible",
  assignment: "Assignment (no numbering)",
  reviewer: "Assigned Reviewer",
  due: "Internal Due Date",
};

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, "");
      if (request.method === "GET" && path === "/progress") return json(await progress(env), 200, cors);
      if (!passcodeOk(request, env)) return json({ error: "Wrong or missing team passcode." }, 401, cors);
      if (request.method === "GET" && path === "/tasks") return json(await tasks(env), 200, cors);
      const m = path.match(/^\/tasks\/(\d+)$/);
      if (request.method === "POST" && m) {
        const body = await request.json().catch(() => ({}));
        return json(await setProgress(env, m[1], body.progress), 200, cors);
      }
      return json({ error: "Not found." }, 404, cors);
    } catch (e) {
      return json({ error: e.message || "Something went wrong." }, e.status || 500, cors);
    }
  },
};

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const h = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Team-Passcode",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (allowed.includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

function passcodeOk(request, env) {
  const given = request.headers.get("X-Team-Passcode") || "";
  const want = env.TEAM_PASSCODE || "";
  if (!want || given.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= given.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}

async function smartsheet(env, path, init = {}) {
  const r = await fetch(`https://api.smartsheet.com/2.0${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.SMARTSHEET_TOKEN}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(`Smartsheet error: ${data.message || r.status}`);
    err.status = 502;
    throw err;
  }
  return data;
}

async function readSheet(env) {
  const sheet = await smartsheet(env, `/sheets/${env.SHEET_ID}`);
  const ids = {};
  for (const [key, title] of Object.entries(COLS)) {
    const c = sheet.columns.find((col) => col.title === title);
    if (c) ids[key] = c.id;
  }
  if (!ids.progress) throw new Error("No 'Progress' column found in the sheet.");
  const rows = sheet.rows.map((row) => {
    const out = { id: String(row.id), row: row.rowNumber };
    for (const [key, colId] of Object.entries(ids)) {
      const cell = row.cells.find((c) => c.columnId === colId);
      const v = cell ? (cell.displayValue ?? cell.value) : null;
      out[key] = v == null ? "" : String(v).trim();
    }
    if (ids.due) {
      const cell = row.cells.find((c) => c.columnId === ids.due);
      out.due = cell && cell.value ? String(cell.value) : "";
    }
    return out;
  });
  return { ids, rows, permalink: sheet.permalink };
}

async function progress(env) {
  const { rows } = await readSheet(env);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  counts["No status yet"] = 0;
  for (const r of rows) {
    if (!r.progress) counts["No status yet"]++;
    else if (r.progress in counts) counts[r.progress]++;
    else counts[`Other: ${r.progress}`] = (counts[`Other: ${r.progress}`] || 0) + 1;
  }
  const now = new Date();
  const label = now.toLocaleString("en-US", {
    timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
  return { updated: now.toISOString(), updatedLabel: `${label} CT (live)`, total: rows.length, counts, live: true };
}

async function tasks(env) {
  const { rows, permalink } = await readSheet(env);
  return { statuses: STATUSES, permalink, rows: rows.filter((r) => r.assignment || r.section) };
}

async function setProgress(env, rowId, value) {
  if (!STATUSES.includes(value)) {
    const err = new Error("That is not one of the five Progress statuses.");
    err.status = 400;
    throw err;
  }
  const cols = await smartsheet(env, `/sheets/${env.SHEET_ID}/columns?includeAll=true`);
  const col = cols.data.find((c) => c.title === COLS.progress);
  if (!col) throw new Error("No 'Progress' column found in the sheet.");
  await smartsheet(env, `/sheets/${env.SHEET_ID}/rows`, {
    method: "PUT",
    body: JSON.stringify([{ id: Number(rowId), cells: [{ columnId: col.id, value }] }]),
  });
  return { id: rowId, progress: value };
}
