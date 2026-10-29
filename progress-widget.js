// Status dropdowns that save to Smartsheet through the relay set in hub-config.js.
// Usage: <div class="cnap-progress"></div> lists everyone's assignments with a name filter;
//        <div class="cnap-progress" data-who="Chip"></div> lists one person's, in date order.
(function () {
  const SHEET = 'https://app.smartsheet.com/sheets/R9cphxw5McqvH7RWRVJG6rGwWh8RR265M7GRwx21';
  const CSS = `
.cnap-progress .up-gate{max-width:460px}
.cnap-progress .up-gate label{display:block;font-weight:700;margin:0 0 6px}
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
@media (max-width:640px){.cnap-progress .up-item{grid-template-columns:minmax(0,1fr)}}`;

  const store = {
    get: (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set: (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} },
  };
  // The passcode lasts only while this browser tab is open (sessionStorage), not between visits.
  const passStore = {
    get: () => { try { return sessionStorage.getItem('cnapPass') || ''; } catch (e) { return ''; } },
    set: (v) => { try { if (v) sessionStorage.setItem('cnapPass', v); else sessionStorage.removeItem('cnapPass'); } catch (e) {} },
  };
  try { localStorage.removeItem('cnapPass'); } catch (e) {}
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const names = (resp) => resp.split('/').map((s) => s.replace(/\(.*?\)/g, '').trim()).filter(Boolean);
  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'T12:00:00');
    return isNaN(dt) ? d : dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  function mount(root) {
    const API = (window.CNAP_API || '').replace(/\/+$/, '');
    const fixed = root.dataset.who || '';
    if (!API) {
      root.innerHTML = '<div class="card"><p style="margin: 0;">Updating your status from the hub isn’t switched on yet. For now, update it in <a href="' + SHEET + '">Smartsheet</a>.</p></div>';
      return;
    }
    root.innerHTML =
      '<form class="card up-gate" hidden><label>Team passcode<input class="up-in" type="password" autocomplete="current-password" required style="display:block;width:100%;margin-top:6px;box-sizing:border-box"></label>' +
      '<div class="up-row" style="margin-top:10px"><button class="btn primary" type="submit">Continue</button></div>' +
      '<p class="up-msg muted">Ask Morgan if you don’t have it. It\u2019s remembered until you close this tab.</p><p class="up-msg up-err" hidden></p></form>' +
      '<div class="up-main" hidden><div class="up-bar">' +
      (fixed ? '' : '<label>Show assignments for <select class="up-sel up-who"><option value="">Everyone</option></select></label>') +
      '<label><input class="up-hide" type="checkbox"> Hide finalized</label>' +
      '<button class="btn sm up-lock" type="button">Forget passcode</button></div>' +
      '<div class="up-list"><p class="muted">Loading assignments from Smartsheet…</p></div></div>';
    const q = (s) => root.querySelector(s);
    const gate = q('.up-gate'), main = q('.up-main'), list = q('.up-list'), who = q('.up-who'), hide = q('.up-hide');
    let pass = passStore.get();
    let data = null;

    // Plain-text POST keeps this a "simple" request, which the Apps Script relay can answer.
    const call = (body) => fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ passcode: pass }, body)) })
      .then((r) => r.json().catch(() => ({ error: 'Error ' + r.status, status: r.status })))
      .then((j) => { if (j.error) { const e = new Error(j.error); e.status = j.status; throw e; } return j; });

    const showGate = (msg) => {
      main.hidden = true; gate.hidden = false;
      const err = gate.querySelector('.up-err'); err.hidden = !msg; err.textContent = msg || '';
      gate.querySelector('input').value = '';
    };
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
      gate.hidden = true; main.hidden = false;
      call({ action: 'tasks' }).then((j) => {
        data = j;
        if (who) {
          const keep = store.get('cnapWho');
          const all = Array.from(new Set(j.rows.flatMap((r) => names(r.responsible)))).sort();
          who.innerHTML = '<option value="">Everyone</option>' + all.map((n) => '<option' + (n === keep ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
        }
        render();
      }).catch((e) => {
        if (e.status === 401) { passStore.set(''); pass = ''; showGate('That passcode didn’t work. Try again.'); }
        else list.innerHTML = '<p class="up-err">Couldn’t load assignments: ' + esc(e.message) + '. Refresh to try again, or use <a href="' + SHEET + '">Smartsheet</a>.</p>';
      });
    };

    gate.addEventListener('submit', (e) => {
      e.preventDefault();
      pass = gate.querySelector('input').value.trim();
      passStore.set(pass);
      load();
    });
    q('.up-lock').addEventListener('click', () => { passStore.set(''); pass = ''; showGate(); });
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
          if (err.status === 401) { passStore.set(''); pass = ''; showGate('The passcode has changed. Enter the new one.'); }
        })
        .finally(() => { sel.disabled = false; });
    });

    if (pass) load(); else showGate();
  }

  const start = () => {
    if (!document.getElementById('cnap-progress-css')) {
      const s = document.createElement('style'); s.id = 'cnap-progress-css'; s.textContent = CSS; document.head.appendChild(s);
    }
    document.querySelectorAll('.cnap-progress').forEach(mount);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
