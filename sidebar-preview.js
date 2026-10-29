// PREVIEW: builds a purple side menu from the page's existing top menu.
(function () {
  const MAP = { 'index.html': 'preview-dashboard.html', 'Chip.html': 'preview-chip.html' };
  const fix = (href) => { const [p, h] = (href || '').split('#'); return (MAP[p] || p) + (h !== undefined ? '#' + h : ''); };
  const CAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const build = (nav) => {
    const items = Array.from(nav.children).map((el) => {
      if (el.matches('a')) return { href: el.getAttribute('href'), text: el.textContent.trim(), on: el.classList.contains('on'), kids: [] };
      const top = el.querySelector('summary a');
      const kids = Array.from(el.querySelectorAll('.pop a')).filter((a) => !a.classList.contains('hd')).map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim() }));
      return { href: top.getAttribute('href'), text: top.textContent.trim(), on: el.classList.contains('on'), kids };
    });
    const here = location.pathname.split('/').pop();
    const aside = document.createElement('aside');
    aside.className = 'sb'; aside.setAttribute('aria-label', 'Site menu');
    aside.innerHTML = '<div class="sb-head"><a class="sb-brand" href="preview-dashboard.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5L12 3l9 7.5"></path><path d="M5 9.5V21h14V9.5"></path></svg>CNAP Phase S Proposal Hub</a><span class="sb-sub">COBRE-S · PAR-27-055</span><button class="sb-close" type="button" aria-label="Close menu">×</button></div>' +
      '<nav class="sb-nav">' + items.map((it, i) => '<div class="sb-item' + (it.on ? ' on open' : '') + '"><div class="sb-row"><a href="' + esc(fix(it.href)) + '"' + (it.on ? ' aria-current="page"' : '') + '>' + esc(it.text) + '</a>' +
        (it.kids.length ? '<button class="sb-tog" type="button" aria-expanded="' + it.on + '" aria-label="Show ' + esc(it.text) + ' pages">' + CAR + '</button>' : '') + '</div>' +
        (it.kids.length ? '<div class="sb-kids">' + it.kids.map((k) => '<a href="' + esc(fix(k.href)) + '"' + (fix(k.href) === here ? ' class="here"' : '') + '>' + esc(k.text) + '</a>').join('') + '</div>' : '') + '</div>').join('') + '</nav>';
    document.body.appendChild(aside);
    aside.addEventListener('click', (e) => {
      const t = e.target.closest('.sb-tog');
      if (t) { const it = t.closest('.sb-item'); it.classList.toggle('open'); t.setAttribute('aria-expanded', it.classList.contains('open')); return; }
      if (e.target.closest('.sb-close') || e.target.closest('a')) document.body.classList.remove('sb-show');
    });
    const note = document.createElement('div'); note.className = 'sb-preview-note';
    note.textContent = 'Preview of the side menu. The live hub is unchanged.';
    document.body.insertBefore(note, document.body.firstChild);
  };
  const addOpenBtn = () => {
    const quick = document.querySelector('.topbar .wrap');
    if (!quick || quick.querySelector('.sb-open')) return;
    const b = document.createElement('button'); b.className = 'sb-open'; b.type = 'button'; b.innerHTML = '☰ Menu';
    b.addEventListener('click', () => document.body.classList.add('sb-show'));
    quick.insertBefore(b, quick.firstChild);
  };
  document.addEventListener('click', (e) => { if (document.body.classList.contains('sb-show') && !e.target.closest('.sb') && !e.target.closest('.sb-open')) document.body.classList.remove('sb-show'); });
  const start = () => {
    const nav = document.querySelector('.topbar .nav');
    if (!nav) return setTimeout(start, 50);
    if (!document.querySelector('.sb')) build(nav);
    addOpenBtn();
    // The Dashboard redraws its top bar; put the menu button back if it disappears.
    setInterval(addOpenBtn, 500);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
