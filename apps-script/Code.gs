// CNAP Phase S hub: relay between the website and Smartsheet, run as a Google Apps Script web app.
// The Smartsheet token lives here in Script Properties, never in the website.
//
// GET  ?action=progress                          status counts for the Dashboard
// POST {"action":"tasks"}                        every assignment row
// POST {"action":"set","rowId":"…","progress":"…"}   sets one row's Progress
//
// Script Properties (Project Settings > Script Properties): SMARTSHEET_TOKEN
// The website sends POST bodies as text/plain, because Apps Script can't answer CORS preflight requests.

var SHEET_ID = '4867656760119172';
var STATUSES = ['Not Started', 'In Progress', 'Ready for Review', 'Applying Reviewer Feedback', 'Finalized'];
var COLS = {
  progress: 'Progress',
  section: 'Proposal Section',
  responsible: 'Responsible',
  assignment: 'Assignment (no numbering)',
  reviewer: 'Assigned Reviewer',
  due: 'Internal Due Date'
};

function doGet(e) {
  return handle_(function () {
    if (e.parameter.action === 'progress') return progress_();
    throw httpError_(404, 'Not found.');
  });
}

function doPost(e) {
  return handle_(function () {
    var body = {};
    try { body = JSON.parse(e.postData.contents); } catch (err) {}
    if (body.action === 'tasks') return tasks_();
    if (body.action === 'set') return setProgress_(String(body.rowId || ''), body.progress);
    throw httpError_(404, 'Not found.');
  });
}

// Apps Script can't set HTTP status codes, so errors come back as {"error": …, "status": …}.
function handle_(fn) {
  var out;
  try { out = fn(); } catch (err) { out = { error: err.message || 'Something went wrong.', status: err.status || 500 }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function httpError_(status, message) {
  var err = new Error(message);
  err.status = status;
  return err;
}

function prop_(name) {
  return PropertiesService.getScriptProperties().getProperty(name) || '';
}

function smartsheet_(path, method, payload) {
  var opts = {
    method: method || 'get',
    headers: { Authorization: 'Bearer ' + prop_('SMARTSHEET_TOKEN') },
    contentType: 'application/json',
    muteHttpExceptions: true
  };
  if (payload) opts.payload = payload;
  var r = UrlFetchApp.fetch('https://api.smartsheet.com/2.0' + path, opts);
  var data = {};
  try { data = JSON.parse(r.getContentText()); } catch (err) {}
  if (r.getResponseCode() >= 300) throw httpError_(502, 'Smartsheet error: ' + (data.message || r.getResponseCode()));
  return data;
}

function readSheet_() {
  var sheet = smartsheet_('/sheets/' + SHEET_ID);
  var ids = {};
  Object.keys(COLS).forEach(function (key) {
    var c = sheet.columns.filter(function (col) { return col.title === COLS[key]; })[0];
    if (c) ids[key] = c.id;
  });
  if (!ids.progress) throw new Error("No 'Progress' column found in the sheet.");
  var rows = sheet.rows.map(function (row) {
    var out = { id: String(row.id), row: row.rowNumber };
    Object.keys(ids).forEach(function (key) {
      var cell = row.cells.filter(function (c) { return c.columnId === ids[key]; })[0];
      var v = cell ? (key === 'due' ? cell.value : (cell.displayValue != null ? cell.displayValue : cell.value)) : null;
      out[key] = v == null ? '' : String(v).trim();
    });
    return out;
  });
  return { rows: rows, permalink: sheet.permalink };
}

function progress_() {
  var rows = readSheet_().rows;
  var counts = {};
  STATUSES.forEach(function (s) { counts[s] = 0; });
  counts['No status yet'] = 0;
  rows.forEach(function (r) {
    if (!r.progress) counts['No status yet']++;
    else if (r.progress in counts) counts[r.progress]++;
    else counts['Other: ' + r.progress] = (counts['Other: ' + r.progress] || 0) + 1;
  });
  var now = new Date();
  var label = Utilities.formatDate(now, 'America/Chicago', 'EEE, MMM d, yyyy, h:mm a');
  return { updated: now.toISOString(), updatedLabel: label + ' CT (live)', total: rows.length, counts: counts, live: true };
}

function tasks_() {
  var s = readSheet_();
  return {
    statuses: STATUSES,
    permalink: s.permalink,
    rows: s.rows.filter(function (r) { return r.assignment || r.section; })
  };
}

function setProgress_(rowId, value) {
  if (!/^\d+$/.test(rowId)) throw httpError_(400, 'Unknown assignment.');
  if (STATUSES.indexOf(value) < 0) throw httpError_(400, 'That is not one of the five Progress statuses.');
  var cols = smartsheet_('/sheets/' + SHEET_ID + '/columns?includeAll=true');
  var col = cols.data.filter(function (c) { return c.title === COLS.progress; })[0];
  if (!col) throw new Error("No 'Progress' column found in the sheet.");
  // Row and column IDs are written as raw digits so they keep full precision.
  smartsheet_('/sheets/' + SHEET_ID + '/rows', 'put',
    '[{"id":' + rowId + ',"cells":[{"columnId":' + col.id + ',"value":' + JSON.stringify(value) + '}]}]');
  return { id: rowId, progress: value };
}

// Run this once from the editor (select it, then click Run) to check the token and sheet before deploying.
function testSetup() {
  var r = progress_();
  Logger.log('Read ' + r.total + ' rows. Finalized: ' + r.counts['Finalized'] + '.');
}
