// Status controls that save to Smartsheet through the relay set in hub-config.js.
// Usage:
//   <details class="acc" data-rows="rowId,rowId">  a status label on the assignment's row, and
//        status dropdown(s) at the top of its body.
//   <div class="cnap-progress"></div>  everyone's assignments, with a name filter.
//   <div class="cnap-progress" data-who="Chip"></div>  one person's assignments, in date order;
//        add data-rest="1" to show only rows no assignment on the page covers (its section
//        hides when there are none).
//   <div class="cnap-passed" data-name="Chip Pickens"></div>  assignments passed to that person
//        (data-name="*" lists every handoff); its section hides when there are none.
// Choosing "Passed to a contributor" opens a small form: who to pass it to, and an optional note.
(function () {
  const SHEET = 'https://app.smartsheet.com/sheets/R9cphxw5McqvH7RWRVJG6rGwWh8RR265M7GRwx21';
  const PASSED = 'Passed to a contributor';
  const CSS = `
.cnap-progress .up-sel,.st-ctl select,.st-pass select,.st-pass textarea{font:inherit;font-size:14.5px;padding:7px 9px;border:1.5px solid #C9C1D9;border-radius:5px;background:#fff;color:#1F1B2B}
.cnap-progress .up-sel:focus,.st-ctl select:focus,.st-pass select:focus,.st-pass textarea:focus{outline:2px solid #512888;outline-offset:1px;border-color:#512888}
.cnap-progress .up-err,.st-err{color:#A1262C;font-size:14px;margin:0}
.cnap-progress .up-bar{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;margin:0 0 18px}
.cnap-progress .up-bar label{font-weight:600;font-size:14.5px;display:flex;gap:8px;align-items:center}
.cnap-progress .up-sec{margin:0 0 22px}
.cnap-progress .up-sec h3{font-family:Archivo,'Source Sans 3',sans-serif;font-size:15px;letter-spacing:0.04em;text-transform:uppercase;color:#512888;margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid #512888}
.up-item{display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,320px);gap:8px 16px;align-items:start;padding:12px 0;border-bottom:1px solid #E4E0EC}
.up-item:last-child{border-bottom:none}
.up-t{font-size:15px;line-height:1.4}
.up-meta{display:block;font-size:13px;color:#6B6579;margin-top:2px}
.up-meta a{color:#512888}
.up-item.done .up-t{color:#6B6579}
.up-list-card{background:#fff;border:1px solid #E4E0EC;border-radius:6px;padding:4px 18px}
@media (max-width:640px){.up-item{grid-template-columns:minmax(0,1fr)}}
.st-pill{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-size:12px;font-weight:700;line-height:1;padding:5px 9px;border-radius:999px;border:1px solid transparent}
.st-pill::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.75}
.st-pill.s0{background:#fff;color:#8A8599;border:1px dashed #C9C1D9}
.st-pill.s1{background:#EEECF2;color:#4A4458}
.st-pill.s2{background:#EDE6F7;color:#512888}
.st-pill.sp{background:#DDF1EC;color:#1F6B5E}
.st-pill.s3{background:#FFF1CF;color:#7A5A00}
.st-pill.s4{background:#E3EEF9;color:#2B5C8F}
.st-pill.s5{background:#512888;color:#fff}
.st-pill.loading{background:#F3F2F6;color:#B2ADBD}
.st-box{display:flex;flex-direction:column;gap:12px;margin:0 0 16px;padding:12px 14px;background:#F7F4FC;border:1px solid #E1D8F0;border-radius:6px}
.st-box .st-h{font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#512888}
.st-ctl{display:flex;flex-direction:column;gap:6px}
.st-ctl .st-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
.st-ctl .st-lab{font-size:13.5px;font-weight:600;color:#4A4458}
.st-msg{font-size:12.5px;color:#6B6579}
.st-msg.ok{color:#2F6B3F}.st-msg.bad{color:#A1262C}
.st-info{font-size:13px;color:#4A4458;margin:0;line-height:1.45}
.st-info b{color:#1F6B5E}
.st-pass{display:flex;flex-direction:column;gap:8px;padding:10px 12px;background:#fff;border:1.5px solid #9FD3C7;border-radius:5px}
.st-pass[hidden]{display:none}
.st-pass label{font-size:13.5px;font-weight:600;color:#1F6B5E;display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center}
.st-pass textarea{width:100%;min-height:58px;box-sizing:border-box;resize:vertical}
.st-pass .st-btns{display:flex;gap:8px;flex-wrap:wrap}
.st-pass button{font:inherit;font-size:13.5px;font-weight:700;border-radius:5px;padding:7px 14px;cursor:pointer;border:1.5px solid #1F6B5E}
.st-pass .st-go{background:#1F6B5E;color:#fff}
.st-pass .st-cancel{background:#fff;color:#1F6B5E}
.st-pass .st-hint{font-size:12px;color:#6B6579;margin:0}
.passed-note{display:block;margin-top:6px;padding:8px 10px;background:#F2FAF8;border-left:3px solid #1F6B5E;border-radius:3px;font-size:14px;color:#1F1B2B}`;

  const store = {
    get: (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set: (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} },
  };
  // Clear passcodes saved by earlier versions; saving no longer needs one.
  try { localStorage.removeItem('cnapPass'); sessionStorage.removeItem('cnapPass'); } catch (e) {}
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const names = (resp) => String(resp || '').split('/').map((s) => s.replace(/\(.*?\)/g, '').trim()).filter(Boolean);
  const first = (full) => String(full || '').split(' ')[0];
  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'T12:00:00');
    return isNaN(dt) ? d : dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  const API = () => (window.CNAP_API || '').replace(/\/+$/, '');
  // Plain-text POST keeps this a "simple" request, which the Apps Script relay can answer.
  const call = (body) => fetch(API(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
    .then((r) => r.json().catch(() => ({ error: 'Error ' + r.status, status: r.status })))
    .then((j) => { if (j.error) { const e = new Error(j.error); e.status = j.status; throw e; } return j; });

  let data = null, byId = {};
  const views = [];   // every place that shows statuses; all are redrawn after a save so they agree
  let tasksPromise = null;
  const getTasks = () => (tasksPromise = tasksPromise || call({ action: 'tasks' }).then((j) => {
    data = j; byId = {};
    j.rows.forEach((r) => { byId[r.id] = r; });
    if (!j.people) j.people = ['Morgan Wills', 'Heather Bailey', 'Chip Pickens', 'Doina Caragea', 'Carl Ade', 'Roxana Ortiz', 'Tim McDaniel', 'Kim Rewinkel'];
    return j;
  }));
  const redraw = () => views.forEach((v) => v());

  const pillClass = (p) => p === PASSED ? 'sp' : ({ 'Not Started': 's1', 'In Progress': 's2', 'Ready for Review': 's3', 'Applying Reviewer Feedback': 's4', 'Finalized': 's5' }[p] || 's0');
  const pillText = (r) => r.progress === PASSED ? (r.passedTo ? 'Passed to ' + first(r.passedTo) : 'Passed on') : (r.progress || 'No status yet');
  const order = (p) => { const i = (data.statuses || []).indexOf(p); return p ? (i < 0 ? 99 : i + 1) : 0; };

  // One row's status control: the dropdown, the pass form, and who it was passed to with the note.
  // lockFinal: on personal pages only Morgan and Heather's final step, "Finalized", can't be chosen.
  const control = (r, label, lockFinal) => {
    const opts = ['<option value=""' + (r.progress ? '' : ' selected') + ' disabled>No status yet</option>'].concat((data.statuses || []).map((s) => {
      const locked = lockFinal && s === 'Finalized';
      return '<option value="' + esc(s) + '"' + (s === r.progress ? ' selected' : '') + (locked ? ' disabled' : '') + '>' +
        esc(s) + (locked ? ' (set by Morgan and Heather)' : '') + '</option>';
    })).join('');
    const people = data.people.map((p) => '<option' + (p === r.passedTo ? ' selected' : '') + '>' + esc(p) + '</option>').join('');
    const info = (r.progress === PASSED && r.passedTo ? '<p class="st-info">Passed to <b>' + esc(r.passedTo) + '</b></p>' : '') +
      (r.note ? '<p class="st-info">Note: ' + esc(r.note) + '</p>' : '');
    return '<div class="st-ctl" data-id="' + esc(r.id) + '"><div class="st-row">' + (label ? '<span class="st-lab">' + esc(label) + '</span>' : '') +
      '<select class="st-sel" aria-label="Progress for ' + esc(r.assignment) + '"' + (lockFinal && r.progress === 'Finalized' ? ' disabled' : '') + '>' + opts + '</select></div>' +
      '<div class="st-pass" hidden><label>Pass to <select class="st-who"><option value="" disabled' + (r.passedTo ? '' : ' selected') + '>Choose a teammate</option>' + people + '</select></label>' +
      '<textarea class="st-note" maxlength="1000" placeholder="Optional note, e.g. &ldquo;I need help with section B&rdquo; or &ldquo;See my reviewer comments.&rdquo;">' + esc(r.note || '') + '</textarea>' +
      '<div class="st-btns"><button type="button" class="st-go">Pass it</button><button type="button" class="st-cancel">Cancel</button></div>' +
      '<p class="st-hint">They&rsquo;ll get an email. Keep notes brief: anyone with the hub&rsquo;s address can read them.</p></div>' +
      info + '<span class="st-msg" aria-live="polite"></span></div>';
  };

  // Saving, shared by every control on the page.
  const save = (ctl, progress, passedTo, note) => {
    const r = byId[ctl.dataset.id], msg = ctl.querySelector('.st-msg');
    ctl.querySelectorAll('select,button,textarea').forEach((el) => { el.disabled = true; });
    msg.className = 'st-msg'; msg.textContent = 'Saving…';
    const body = { action: 'set', rowId: r.id, progress };
    if (progress === PASSED) { body.passedTo = passedTo; body.note = note; }
    call(body).then(() => {
      r.progress = progress;
      if (progress === PASSED) { r.passedTo = passedTo; r.note = String(note || '').trim(); } else r.passedTo = '';
      redraw();
      document.querySelectorAll('.st-ctl[data-id="' + r.id + '"] .st-msg').forEach((m) => {
        m.className = 'st-msg ok'; m.textContent = progress === PASSED ? 'Passed to ' + first(passedTo) + ' and saved to Smartsheet' : 'Saved to Smartsheet';
      });
    }).catch((err) => {
      ctl.querySelectorAll('select,button,textarea').forEach((el) => { el.disabled = false; });
      ctl.querySelector('.st-sel').value = r.progress || '';
      msg.className = 'st-msg bad'; msg.textContent = 'Not saved: ' + err.message;
    });
  };
  document.addEventListener('change', (e) => {
    const sel = e.target.closest && e.target.closest('.st-sel'); if (!sel || !data) return;
    const ctl = sel.closest('.st-ctl'), form = ctl.querySelector('.st-pass');
    if (sel.value === PASSED) { form.hidden = false; ctl.querySelector('.st-who').focus(); return; }
    form.hidden = true;
    save(ctl, sel.value);
  });
  document.addEventListener('click', (e) => {
    const go = e.target.closest && e.target.closest('.st-go'), cancel = e.target.closest && e.target.closest('.st-cancel');
    if (!go && !cancel) return;
    const ctl = (go || cancel).closest('.st-ctl'), r = byId[ctl.dataset.id];
    if (cancel) { ctl.querySelector('.st-pass').hidden = true; ctl.querySelector('.st-sel').value = r.progress || ''; return; }
    const who = ctl.querySelector('.st-who').value, msg = ctl.querySelector('.st-msg');
    if (!who) { msg.className = 'st-msg bad'; msg.textContent = 'Choose who to pass it to.'; return; }
    save(ctl, PASSED, who, ctl.querySelector('.st-note').value);
  });

  const meta = (parts) => parts.filter(Boolean).map((p) => typeof p === 'string' ? esc(p) : p.html).join(' · ');
  const folderLink = (r) => r.folder ? { html: '<a href="' + esc(r.folder) + '" target="_blank" rel="noopener">Open its Dropbox folder</a>' } : '';

  // Lists: everyone's, one person's, or the safety net of rows no assignment covers.
  function mountList(root) {
    const fixed = root.dataset.who || '', restOnly = root.dataset.rest === '1';
    if (!API()) {
      root.innerHTML = '<div class="card"><p style="margin: 0;">Updating your status from the hub isn’t switched on yet. For now, update it in <a href="' + SHEET + '">Smartsheet</a>.</p></div>';
      return;
    }
    const restSec = restOnly ? root.closest('section') : null;
    if (restSec) restSec.hidden = true;
    root.innerHTML = '<div class="up-bar">' + (fixed ? '' : '<label>Show assignments for <select class="up-sel up-who"><option value="">Everyone</option></select></label>') +
      '<label><input class="up-hide" type="checkbox"> Hide finalized</label></div><div class="up-list"><p class="muted">Loading assignments from Smartsheet…</p></div>';
    const list = root.querySelector('.up-list'), who = root.querySelector('.up-who'), hide = root.querySelector('.up-hide');
    const draw = () => {
      let rows = data.rows;
      if (restOnly) { const covered = new Set(Array.from(document.querySelectorAll('[data-rows]')).flatMap((el) => el.dataset.rows.split(','))); rows = rows.filter((r) => !covered.has(r.id)); }
      const person = fixed || (who ? who.value : '');
      rows = rows.filter((r) => (!person || names(r.responsible).includes(person)) && !(hide.checked && r.progress === 'Finalized'));
      if (restSec) restSec.hidden = !rows.length;
      if (!rows.length) { list.innerHTML = '<p class="muted">No assignments match.</p>'; return; }
      const item = (r, m) => '<div class="up-item' + (r.progress === 'Finalized' ? ' done' : '') + '"><div class="up-t">' + esc(r.assignment) +
        '<span class="up-meta">' + m + '</span></div>' + control(r, '', !!fixed) + '</div>';
      if (fixed) {
        rows = rows.slice().sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
        list.innerHTML = '<div class="up-list-card">' + rows.map((r) => item(r, meta([r.due && 'Due ' + fmtDate(r.due), r.section, r.responsible !== fixed && 'With: ' + r.responsible, folderLink(r)]))).join('') + '</div>';
        return;
      }
      const groups = [];
      rows.forEach((r) => { let g = groups.find((x) => x.name === r.section); if (!g) groups.push(g = { name: r.section, rows: [] }); g.rows.push(r); });
      list.innerHTML = groups.map((g) => '<div class="up-sec"><h3>' + esc(g.name || 'Other') + '</h3>' +
        g.rows.map((r) => item(r, meta([r.responsible && 'Responsible: ' + r.responsible, r.due && 'Due ' + fmtDate(r.due), r.reviewer && 'Reviewer: ' + r.reviewer, folderLink(r)]))).join('') + '</div>').join('');
    };
    getTasks().then(() => {
      if (who) {
        const keep = store.get('cnapWho');
        const all = Array.from(new Set(data.rows.flatMap((r) => names(r.responsible)))).sort();
        who.innerHTML = '<option value="">Everyone</option>' + all.map((n) => '<option' + (n === keep ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
        who.addEventListener('change', () => { store.set('cnapWho', who.value); draw(); });
      }
      hide.addEventListener('change', draw);
      views.push(draw); draw();
    }).catch((e) => {
      if (restSec) return;
      list.innerHTML = '<p class="up-err">Couldn’t load assignments: ' + esc(e.message) + '. Refresh to try again.</p>';
    });
  }

  // "Passed to you": assignments someone has handed to this person (data-name="*": every handoff).
  function mountPassed(root) {
    const name = root.dataset.name || '';
    const sec = root.closest('section');
    if (sec) sec.hidden = true;
    if (!API()) return;
    const draw = () => {
      const rows = data.rows.filter((r) => r.progress === PASSED && r.passedTo && (name === '*' || r.passedTo === name))
        .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
      if (sec) sec.hidden = !rows.length;
      root.innerHTML = rows.length ? '<div class="up-list-card">' + rows.map((r) => '<div class="up-item"><div class="up-t">' + esc(r.assignment) +
        '<span class="up-meta">' + meta([name === '*' && 'To: ' + r.passedTo, r.responsible && 'From: ' + r.responsible, r.due && 'Due ' + fmtDate(r.due), r.section, folderLink(r)]) + '</span>' +
        (r.note ? '<span class="passed-note">' + esc(r.note) + '</span>' : '') + '</div>' + control(r, '', name !== '*') + '</div>').join('') + '</div>' : '';
    };
    getTasks().then(() => { views.push(draw); draw(); }).catch(() => {});
  }

  // A status label on each assignment's row, and its dropdown(s) at the top of the assignment.
  function enhanceAccordions() {
    const accs = Array.from(document.querySelectorAll('details.acc[data-rows]'));
    if (!accs.length || !API()) return;
    const COMPONENT = (sec) => /OVERALL/i.test(sec) ? 'Center' : /ADMINISTRATIVE/i.test(sec) ? 'Admin Core' : /SRP/i.test(sec) ? 'SRP Core' : ((sec.match(/(BN|NI|CN) Core/) || [])[0] || sec);
    const short = (a) => a.split(' — ')[0].split(' (')[0].trim();
    accs.forEach((acc) => {
      const m = acc.querySelector(':scope > summary .meta');
      const pill = document.createElement('span'); pill.className = 'st-pill loading'; pill.textContent = 'Status…';
      if (m) m.insertBefore(pill, m.firstChild);
      const box = document.createElement('div'); box.className = 'st-box'; box.innerHTML = '<span class="st-h">Your status</span><span class="st-msg">Loading from Smartsheet…</span>';
      const body = acc.querySelector(':scope > .body') || acc;
      body.insertBefore(box, body.firstChild);
      acc._st = { pill, box };
    });
    getTasks().then(() => {
      accs.forEach((acc) => {
        const rows = acc.dataset.rows.split(',').map((id) => byId[id]).filter(Boolean);
        const { box, pill } = acc._st;
        if (!rows.length) { pill.remove(); box.innerHTML = '<p class="st-err">This assignment isn’t linked to Smartsheet. Ask Morgan.</p>'; return; }
        const comps = new Set(rows.map((r) => COMPONENT(r.section))), titles = new Set(rows.map((r) => short(r.assignment)));
        const label = (r) => [comps.size > 1 ? COMPONENT(r.section) : '', titles.size > 1 ? short(r.assignment) : ''].filter(Boolean).join(' · ');
        const draw = () => {
          // Several rows: the label shows the least-advanced one, so nothing looks done before it all is.
          const least = rows.slice().sort((a, b) => order(a.progress) - order(b.progress))[0];
          pill.className = 'st-pill ' + pillClass(least.progress); pill.textContent = pillText(least);
          pill.title = rows.length > 1 ? rows.map((r) => label(r) + ': ' + pillText(r)).join('\n') : '';
          box.innerHTML = '<span class="st-h">Your status</span>' + rows.map((r) => control(r, rows.length > 1 ? label(r) : '', true)).join('');
        };
        views.push(draw); draw();
      });
    }).catch((e) => {
      accs.forEach((acc) => { acc._st.pill.remove(); acc._st.box.innerHTML = '<p class="st-err">Couldn’t load your status: ' + esc(e.message) + '. Refresh to try again.</p>'; });
    });
  }

  const start = () => {
    if (!document.getElementById('cnap-progress-css')) {
      const s = document.createElement('style'); s.id = 'cnap-progress-css'; s.textContent = CSS; document.head.appendChild(s);
    }
    enhanceAccordions();
    document.querySelectorAll('.cnap-passed').forEach(mountPassed);
    document.querySelectorAll('.cnap-progress').forEach(mountList);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
