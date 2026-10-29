// Status dropdowns that save to Smartsheet through the relay set in hub-config.js.
// Usage: <div class="cnap-progress"></div> lists everyone's assignments with a name filter;
//        <div class="cnap-progress" data-who="Chip"></div> lists one person's, in date order.
//        <details class="acc" data-rows="rowId,rowId"> gets a status label on its row and status
//        dropdowns at the top of its body; add data-rest="1" to a person's list to show only rows
//        that no assignment on the page covers (its section hides when there are none).
(function () {
  const SHEET = 'https://app.smartsheet.com/sheets/R9cphxw5McqvH7RWRVJG6rGwWh8RR265M7GRwx21';
  const CSS = `
.cnap-progress .up-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.cnap-progress .up-in,.cnap-progress .up-sel{font:inherit;font-size:15px;padding:8px 10px;border:1.5px solid #C9C1D9;border-radius:8px;background:#fff;color:#1F1B2B}
.cnap-progress .up-in{flex:1;min-width:0}
.cnap-progress .up-in:focus,.cnap-progress .up-sel:focus{outline:2px solid #512888;outline-offset:1px;border-color:#512888}
.cnap-progress .up-msg{margin:10px 0 0;font-size:14px}
.cnap-progress .up-err{color:#A1262C}
.cnap-progress .up-bar{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;margin:0 0 18px}
.cnap-progress .up-bar label{font-weight:600;font-size:14.5px;display:flex;gap:8px;align-items:center}
.cnap-progress .up-sec{margin:0 0 22px}
.cnap-progress .up-sec h3{font-family:Archivo,'Source Sans 3',sans-serif;font-size:15px;letter-spacing:0.04em;text-transform:uppercase;color:#512888;margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid #512888}
.cnap-progress .up-item{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:8px 16px;align-items:center;padding:10px 0;border-bottom:1px solid #E4E0EC}
.cnap-progress .up-item:last-child{border-bottom:none}
.cnap-progress .up-t{font-size:15px;line-height:1.4}
.cnap-progress .up-meta{display:block;font-size:13px;color:#6B6579;margin-top:2px}
.cnap-progress .up-ctl{display:flex;flex-direction:column;gap:3px}
.cnap-progress .up-ctl .up-sel{width:100%}
.cnap-progress .up-st{font-size:12.5px;min-height:16px;color:#6B6579}
.cnap-progress .up-st.ok{color:#2F6B3F}
.cnap-progress .up-st.bad{color:#A1262C}
.cnap-progress .up-item.done .up-t{color:#6B6579}
.cnap-progress .up-list-card{background:#fff;border:1px solid #E4E0EC;border-radius:12px;padding:4px 18px}
@media (max-width:640px){.cnap-progress .up-item{grid-template-columns:minmax(0,1fr)}}
.st-pill{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-size:12px;font-weight:700;line-height:1;padding:5px 9px;border-radius:999px;border:1px solid transparent}
.st-pill::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.75}
.st-pill.s0{background:#fff;color:#8A8599;border:1px dashed #C9C1D9}
.st-pill.s1{background:#EEECF2;color:#4A4458}
.st-pill.s2{background:#EDE6F7;color:#512888}
.st-pill.s3{background:#FFF1CF;color:#7A5A00}
.st-pill.s4{background:#E3EEF9;color:#2B5C8F}
.st-pill.s5{background:#512888;color:#fff}
.st-pill.loading{background:#F3F2F6;color:#B2ADBD;border-color:transparent}
.st-box{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;margin:0 0 16px;padding:12px 14px;background:#F7F4FC;border:1px solid #E1D8F0;border-radius:10px}
.st-box .st-h{font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#512888}
.st-box .st-one{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
.st-box .st-lab{font-size:13.5px;font-weight:600;color:#4A4458}
.st-box select{font:inherit;font-size:14.5px;padding:6px 9px;border:1.5px solid #C9C1D9;border-radius:8px;background:#fff;color:#1F1B2B}
.st-box select:focus{outline:2px solid #512888;outline-offset:1px;border-color:#512888}
.st-box .st-msg{font-size:12.5px;color:#6B6579;min-height:16px}
.st-box .st-msg.ok{color:#2F6B3F}.st-box .st-msg.bad{color:#A1262C}
.st-box .st-err{font-size:13.5px;color:#A1262C;margin:0}`;

  const store = {
    get: (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set: (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} },
  };
  // Clear passcodes saved by earlier versions; saving no longer needs one.
  try { localStorage.removeItem('cnapPass'); sessionStorage.removeItem('cnapPass'); } catch (e) {}
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const names = (resp) => resp.split('/').map((s) => s.replace(/\(.*?\)/g, '').trim()).filter(Boolean);
  const API = () => (window.CNAP_API || '').replace(/\/+$/, '');
  // Plain-text POST keeps this a "simple" request, which the Apps Script relay can answer.
  const call = (body) => fetch(API(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
    .then((r) => r.json().catch(() => ({ error: 'Error ' + r.status, status: r.status })))
    .then((j) => { if (j.error) { const e = new Error(j.error); e.status = j.status; throw e; } return j; });
  let tasksPromise = null;
  const getTasks = () => (tasksPromise = tasksPromise || call({ action: 'tasks' }));
  const STATUS_CLASS = { 'Not Started': 's1', 'In Progress': 's2', 'Ready for Review': 's3', 'Applying Reviewer Feedback': 's4', 'Finalized': 's5' };
  const COMPONENT = (sec) => /OVERALL/i.test(sec) ? 'Center' : /ADMINISTRATIVE/i.test(sec) ? 'Admin Core' : /SRP/i.test(sec) ? 'SRP Core' : ((sec.match(/(BN|NI|CN) Core/) || [])[0] || sec);
  const shortAssignment = (a) => a.split(' \u2014 ')[0].split(' (')[0].trim();
  const coveredIds = () => new Set(Array.from(document.querySelectorAll('[data-rows]')).flatMap((el) => el.dataset.rows.split(',')));
  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'T12:00:00');
    return isNaN(dt) ? d : dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  function mount(root) {
    const fixed = root.dataset.who || '';
    const restOnly = root.dataset.rest === '1';
    if (!API()) {
      root.innerHTML = '<div class="card"><p style="margin: 0;">Updating your status from the hub isn’t switched on yet. For now, update it in <a href="' + SHEET + '">Smartsheet</a>.</p></div>';
      return;
    }
    root.innerHTML =
      '<div class="up-main"><div class="up-bar">' +
      (fixed ? '' : '<label>Show assignments for <select class="up-sel up-who"><option value="">Everyone</option></select></label>') +
      '<label><input class="up-hide" type="checkbox"> Hide finalized</label>' +
      '</div>' +
      '<div class="up-list"><p class="muted">Loading assignments from Smartsheet…</p></div></div>';
    const q = (s) => root.querySelector(s);
    const list = q('.up-list'), who = q('.up-who'), hide = q('.up-hide');
    let data = null;

    const item = (r, meta) => {
      const opts = ['<option value=""' + (r.progress ? '' : ' selected') + ' disabled>No status yet</option>']
        .concat(data.statuses.map((s) => {
          // On personal pages only Morgan and Heather's final step, "Finalized", can't be chosen.
          const locked = fixed && s === 'Finalized';
          return '<option value="' + esc(s) + '"' + (s === r.progress ? ' selected' : '') + (locked ? ' disabled' : '') + '>' + esc(s) + (locked ? ' (set by Morgan and Heather)' : '') + '</option>';
        })).join('');
      return '<div class="up-item' + (r.progress === 'Finalized' ? ' done' : '') + '" data-id="' + esc(r.id) + '"><div class="up-t">' + esc(r.assignment) +
        '<span class="up-meta">' + esc(meta) + '</span></div><div class="up-ctl"><select class="up-sel" aria-label="Progress for ' + esc(r.assignment) + '"' + (fixed && r.progress === 'Finalized' ? ' disabled' : '') + '>' + opts +
        '</select><span class="up-st" aria-live="polite"></span></div></div>';
    };
    const render = () => {
      const person = fixed || (who ? who.value : '');
      const rows = data.rows.filter((r) => (!person || names(r.responsible).includes(person)) && !(hide.checked && r.progress === 'Finalized'));
      if (!rows.length) { list.innerHTML = '<p class="muted">No assignments match.</p>'; return; }
      if (fixed) {
        rows.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
        list.innerHTML = '<div class="up-list-card">' + rows.map((r) => item(r, [r.due && 'Due ' + fmtDate(r.due), r.section, r.responsible !== fixed && 'With: ' + r.responsible].filter(Boolean).join(' · '))).join('') + '</div>';
        return;
      }
      const groups = [];
      rows.forEach((r) => {
        let g = groups.find((x) => x.name === r.section);
        if (!g) { g = { name: r.section, rows: [] }; groups.push(g); }
        g.rows.push(r);
      });
      list.innerHTML = groups.map((g) => '<div class="up-sec"><h3>' + esc(g.name || 'Other') + '</h3>' +
        g.rows.map((r) => item(r, [r.responsible && 'Responsible: ' + r.responsible, r.due && 'Due ' + fmtDate(r.due), r.reviewer && 'Reviewer: ' + r.reviewer].filter(Boolean).join(' · '))).join('') + '</div>').join('');
    };
    const load = () => {
      getTasks().then((j) => {
        data = j;
        if (restOnly) {
          const covered = coveredIds();
          data = Object.assign({}, j, { rows: j.rows.filter((r) => !covered.has(r.id) && (!fixed || names(r.responsible).includes(fixed))) });
          const sec = root.closest('section');
          if (!data.rows.length && sec) { sec.hidden = true; return; }
        }
        if (who) {
          const keep = store.get('cnapWho');
          const all = Array.from(new Set(j.rows.flatMap((r) => names(r.responsible)))).sort();
          who.innerHTML = '<option value="">Everyone</option>' + all.map((n) => '<option' + (n === keep ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
        }
        render();
      }).catch((e) => {
        list.innerHTML = '<p class="up-err">Couldn’t load assignments: ' + esc(e.message) + '. Refresh to try again, or use <a href="' + SHEET + '">Smartsheet</a>.</p>';
      });
    };

    if (who) who.addEventListener('change', () => { store.set('cnapWho', who.value); render(); });
    hide.addEventListener('change', render);
    list.addEventListener('change', (e) => {
      const sel = e.target.closest('select'); if (!sel) return;
      const el = sel.closest('.up-item'), st = el.querySelector('.up-st');
      const row = data.rows.find((r) => r.id === el.dataset.id);
      const prev = row.progress, next = sel.value;
      sel.disabled = true; st.className = 'up-st'; st.textContent = 'Saving…';
      call({ action: 'set', rowId: row.id, progress: next })
        .then(() => {
          row.progress = next;
          st.className = 'up-st ok'; st.textContent = 'Saved to Smartsheet';
          el.classList.toggle('done', next === 'Finalized');
        })
        .catch((err) => {
          sel.value = prev;
          st.className = 'up-st bad'; st.textContent = 'Not saved: ' + err.message;
        })
        .finally(() => { sel.disabled = false; });
    });

    load();
  }

  // Status label on each assignment's row, and its dropdown(s) at the top of the assignment.
  function enhanceAccordions() {
    const accs = Array.from(document.querySelectorAll('details.acc[data-rows]'));
    if (!accs.length || !API()) return;
    accs.forEach((acc) => {
      const meta = acc.querySelector(':scope > summary .meta');
      const pill = document.createElement('span'); pill.className = 'st-pill loading'; pill.textContent = 'Status\u2026';
      if (meta) meta.insertBefore(pill, meta.firstChild);
      const box = document.createElement('div'); box.className = 'st-box'; box.innerHTML = '<span class="st-h">Your status</span><span class="st-msg">Loading from Smartsheet\u2026</span>';
      const body = acc.querySelector(':scope > .body') || acc;
      body.insertBefore(box, body.firstChild);
      acc._st = { pill, box };
    });
    const ORDER = ['', 'Not Started', 'In Progress', 'Ready for Review', 'Applying Reviewer Feedback', 'Finalized'];
    const setPill = (acc, rows) => {
      // Several rows: show the least-advanced one, so nothing looks done before it all is.
      const least = rows.map((r) => r.progress || '').sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))[0];
      const p = acc._st.pill;
      p.className = 'st-pill ' + (STATUS_CLASS[least] || 's0');
      p.textContent = least || 'No status yet';
      p.title = rows.length > 1 ? rows.map((r) => r._label + ': ' + (r.progress || 'No status yet')).join('\n') : '';
    };
    getTasks().then((data) => {
      const byId = {}; data.rows.forEach((r) => { byId[r.id] = r; });
      accs.forEach((acc) => {
        const rows = acc.dataset.rows.split(',').map((id) => byId[id]).filter(Boolean);
        const { box } = acc._st;
        if (!rows.length) { acc._st.pill.remove(); box.innerHTML = '<p class="st-err">This assignment isn\u2019t linked to Smartsheet. Ask Morgan.</p>'; return; }
        const comps = new Set(rows.map((r) => COMPONENT(r.section))), names2 = new Set(rows.map((r) => shortAssignment(r.assignment)));
        rows.forEach((r) => { r._label = [comps.size > 1 ? COMPONENT(r.section) : '', names2.size > 1 ? shortAssignment(r.assignment) : ''].filter(Boolean).join(' \u00b7 '); });
        box.innerHTML = '<span class="st-h">Your status</span>' + rows.map((r) => {
          const opts = ['<option value=""' + (r.progress ? '' : ' selected') + ' disabled>No status yet</option>'].concat(data.statuses.map((s) =>
            '<option value="' + esc(s) + '"' + (s === r.progress ? ' selected' : '') + (s === 'Finalized' ? ' disabled' : '') + '>' + esc(s) + (s === 'Finalized' ? ' (set by Morgan and Heather)' : '') + '</option>')).join('');
          return '<label class="st-one" data-id="' + esc(r.id) + '">' + (r._label ? '<span class="st-lab">' + esc(r._label) + '</span>' : '') +
            '<select' + (r.progress === 'Finalized' ? ' disabled' : '') + '>' + opts + '</select></label>';
        }).join('') + '<span class="st-msg" aria-live="polite"></span>';
        setPill(acc, rows);
        box.addEventListener('change', (e) => {
          const sel = e.target.closest('select'); if (!sel) return;
          const row = byId[sel.closest('.st-one').dataset.id], msg = box.querySelector('.st-msg');
          const prev = row.progress, next = sel.value;
          sel.disabled = true; msg.className = 'st-msg'; msg.textContent = 'Saving\u2026';
          call({ action: 'set', rowId: row.id, progress: next })
            .then(() => { row.progress = next; msg.className = 'st-msg ok'; msg.textContent = 'Saved to Smartsheet'; setPill(acc, rows); })
            .catch((err) => { sel.value = prev; msg.className = 'st-msg bad'; msg.textContent = 'Not saved: ' + err.message; })
            .finally(() => { sel.disabled = false; });
        });
      });
    }).catch((e) => {
      accs.forEach((acc) => { acc._st.pill.remove(); acc._st.box.innerHTML = '<p class="st-err">Couldn\u2019t load your status: ' + esc(e.message) + '. Refresh to try again.</p>'; });
    });
  }

  const start = () => {
    if (!document.getElementById('cnap-progress-css')) {
      const s = document.createElement('style'); s.id = 'cnap-progress-css'; s.textContent = CSS; document.head.appendChild(s);
    }
    enhanceAccordions();
    document.querySelectorAll('.cnap-progress').forEach(mount);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
