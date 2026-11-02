// CNAP Phase S hub: relay between the website and Smartsheet, run as a Google Apps Script web app.
// The Smartsheet token lives here in Script Properties, never in the website.
//
// GET  ?action=progress                          status counts for the Dashboard
// POST {"action":"tasks"}                        every assignment row
// POST {"action":"set","rowId":"…","progress":"…"}   sets one row's Progress
// POST {"action":"set","rowId":"…","progress":"Passed to a contributor","passedTo":"Name","note":"…"}
//      passes it to a teammate: also fills "Passed to" (Smartsheet emails them) and "Handoff note"
// The allowed statuses are read from the Progress column's dropdown, so adding one in Smartsheet needs no code change.
//
// Script Properties (Project Settings > Script Properties): SMARTSHEET_TOKEN
// The website sends POST bodies as text/plain, because Apps Script can't answer CORS preflight requests.

var SHEET_ID = '4867656760119172';
var PASSED = 'Passed to a contributor';
// People an assignment can be passed to. Add an email when you have it; without one the name
// is still saved, but Smartsheet can't email that person.
var CONTACTS = {
  'Morgan Wills': 'mkwills@ksu.edu',
  'Heather Bailey': 'hbailey@ksu.edu',
  'Chip Pickens': 'pickens@ksu.edu',
  'Doina Caragea': 'dcaragea@ksu.edu',
  'Carl Ade': 'cade@ksu.edu',
  'Roxana Ortiz': 'roxana@ksu.edu',
  'Tim McDaniel': '',
  'Kim Rewinkel': ''
};
var COLS = {
  progress: 'Progress',
  section: 'Proposal Section',
  responsible: 'Responsible',
  assignment: 'Assignment (no numbering)',
  reviewer: 'Assigned Reviewer',
  due: 'Internal Due Date',
  passedTo: 'Passed to',
  note: 'Handoff note',
  folder: '1. Working Draft Folder (save working draft here)'
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
    if (body.action === 'set') return setProgress_(String(body.rowId || ''), body.progress, body.passedTo, body.note);
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
  var progressCol = sheet.columns.filter(function (col) { return col.id === ids.progress; })[0];
  var rows = sheet.rows.map(function (row) {
    var out = { id: String(row.id), row: row.rowNumber };
    Object.keys(ids).forEach(function (key) {
      var cell = row.cells.filter(function (c) { return c.columnId === ids[key]; })[0];
      var v = !cell ? null : key === 'due' ? cell.value : key === 'folder' ? (cell.hyperlink && cell.hyperlink.url)
        : (cell.displayValue != null ? cell.displayValue : cell.value);
      out[key] = v == null ? '' : String(v).trim();
    });
    return out;
  });
  return { rows: rows, permalink: sheet.permalink, ids: ids, statuses: progressCol.options || [] };
}

function progress_() {
  var s = readSheet_(), rows = s.rows;
  var counts = {};
  s.statuses.forEach(function (st) { counts[st] = 0; });
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
    statuses: s.statuses,
    people: Object.keys(CONTACTS),
    permalink: s.permalink,
    rows: s.rows.filter(function (r) { return r.assignment || r.section; })
  };
}

function setProgress_(rowId, value, passedTo, note) {
  if (!/^\d+$/.test(rowId)) throw httpError_(400, 'Unknown assignment.');
  var sheet = readSheet_();
  if (sheet.statuses.indexOf(value) < 0) throw httpError_(400, 'That is not one of the Progress statuses.');
  var ids = sheet.ids;
  // Row and column IDs are written as raw digits so they keep full precision.
  var cell = function (colId, json) { return '{"columnId":' + colId + ',' + json + '}'; };
  var cells = [cell(ids.progress, '"value":' + JSON.stringify(value))];
  if (value === PASSED) {
    if (!(passedTo in CONTACTS)) throw httpError_(400, 'Choose who to pass it to.');
    if (!ids.passedTo) throw new Error("No 'Passed to' column found in the sheet.");
    var email = CONTACTS[passedTo];
    cells.push(cell(ids.passedTo, email
      ? '"objectValue":' + JSON.stringify({ objectType: 'CONTACT', name: passedTo, email: email })
      : '"value":' + JSON.stringify(passedTo) + ',"strict":false'));
    if (ids.note) cells.push(cell(ids.note, '"value":' + JSON.stringify(String(note || '').trim().slice(0, 1000))));
  } else if (ids.passedTo) {
    // Any other status ends the handoff; the last note stays for reference.
    cells.push(cell(ids.passedTo, '"value":""'));
  }
  smartsheet_('/sheets/' + SHEET_ID + '/rows', 'put', '[{"id":' + rowId + ',"cells":[' + cells.join(',') + ']}]');
  return { id: rowId, progress: value, passedTo: value === PASSED ? passedTo : '' };
}

// Run this once from the editor (select it, then click Run) to check the token and sheet before deploying.
function testSetup() {
  var r = progress_();
  Logger.log('Read ' + r.total + ' rows. Finalized: ' + r.counts['Finalized'] + '.');
}
