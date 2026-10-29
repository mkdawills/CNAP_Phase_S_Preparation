// Side menu: built from the page's existing top menu (hidden by sidebar.css), so every page's
// menu stays in one place in its HTML. Desktop shows it on the left; phones open it with Menu.
(function () {
  const fix = (href) => href || '';
  const CAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const svg = (d) => '<svg class="sb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const ICON = {
    'index.html': svg('<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>'),
    'Guidance.html': svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    'Timeline.html': svg('<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/>'),
    'Workflow.html': svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    'Conventions.html': svg('<path d="M4 7V5h16v2M9 19h6M12 5v14"/>'),
    'Review.html': svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>'),
    'PhaseS.html': svg('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
    'StrategicPlan.html': svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
    'SRP.html': svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>'),
    'Definitions.html': svg('<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/>'),
  };
  // Shorter labels and three groups keep the list easy to scan.
  const LABEL = { 'Phase S Overview & Comparisons': 'Phase S Overview' };
  const GROUPS = [
    { name: '', pages: ['index.html'] },
    { name: 'Your work', pages: ['Guidance.html', 'Timeline.html', 'Workflow.html'] },
    { name: 'Writing', pages: ['Conventions.html', 'Review.html'] },
    { name: 'Background', pages: ['PhaseS.html', 'StrategicPlan.html', 'SRP.html', 'Definitions.html'] },
  ];
  const shortKid = (t) => { const name = t.split(' · ')[0]; return /^(Dr|Mr|Ms|Mrs)\. /.test(name) ? name.replace(/^(Dr|Mr|Ms|Mrs)\. /, '') : t; };
  const build = (nav) => {
    const items = Array.from(nav.children).map((el) => {
      if (el.matches('a')) return { href: el.getAttribute('href'), text: el.textContent.trim(), on: el.classList.contains('on'), kids: [] };
      const top = el.querySelector('summary a');
      const kids = Array.from(el.querySelectorAll('.pop a')).filter((a) => !a.classList.contains('hd')).map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim() }));
      return { href: top.getAttribute('href'), text: top.textContent.trim(), on: el.classList.contains('on'), kids };
    });
    const here = location.pathname.split('/').pop() || 'index.html';
    const byHref = {}; items.forEach((it) => { byHref[it.href] = it; });
    const listed = new Set();
    const itemHtml = (it) => {
      listed.add(it.href);
      const label = LABEL[it.text] || it.text;
      const kids = it.kids.length ? '<div class="sb-kids"><div class="sb-kids-in">' + it.kids.map((k) => {
        const short = shortKid(k.text);
        return '<a href="' + esc(fix(k.href)) + '"' + (fix(k.href) === here ? ' class="here" aria-current="page"' : '') + (short !== k.text ? ' title="' + esc(k.text) + '"' : '') + '>' + esc(short) + '</a>';
      }).join('') + '</div></div>' : '';
      return '<div class="sb-item' + (it.on ? ' on open' : '') + '"><div class="sb-row"><a href="' + esc(fix(it.href)) + '"' + (it.on && !it.kids.some((k) => fix(k.href) === here) ? ' aria-current="page"' : '') + '>' + (ICON[it.href] || '') + '<span>' + esc(label) + '</span></a>' +
        (it.kids.length ? '<button class="sb-tog" type="button" aria-expanded="' + it.on + '" aria-label="Show ' + esc(label) + ' pages">' + CAR + '</button>' : '') + '</div>' + kids + '</div>';
    };
    let html = GROUPS.map((g) => {
      const its = g.pages.map((p) => byHref[p]).filter(Boolean);
      if (!its.length) return '';
      return '<div class="sb-group">' + (g.name ? '<p class="sb-label">' + esc(g.name) + '</p>' : '') + its.map(itemHtml).join('') + '</div>';
    }).join('');
    const rest = items.filter((it) => !listed.has(it.href));
    if (rest.length) html += '<div class="sb-group"><p class="sb-label">More</p>' + rest.map(itemHtml).join('') + '</div>';
    const aside = document.createElement('aside');
    aside.className = 'sb'; aside.setAttribute('aria-label', 'Site menu');
    aside.innerHTML = '<div class="sb-head"><button class="sb-close" type="button" aria-label="Close menu">×</button></div>' +
      '<nav class="sb-nav">' + html + '</nav>';
    document.body.appendChild(aside);
    aside.addEventListener('click', (e) => {
      const t = e.target.closest('.sb-tog');
      if (t) {
        const it = t.closest('.sb-item'), opening = !it.classList.contains('open');
        // One section open at a time.
        aside.querySelectorAll('.sb-item.open').forEach((o) => { o.classList.remove('open'); const b = o.querySelector('.sb-tog'); if (b) b.setAttribute('aria-expanded', 'false'); });
        if (opening) { it.classList.add('open'); t.setAttribute('aria-expanded', 'true'); }
        return;
      }
      if (e.target.closest('.sb-close') || e.target.closest('a')) document.body.classList.remove('sb-show');
    });
  };
  const addOpenBtn = () => {
    const quick = document.querySelector('.topbar .wrap');
    if (!quick || quick.querySelector('.sb-open')) return;
    const b = document.createElement('button'); b.className = 'sb-open'; b.type = 'button'; b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>Menu';
    b.addEventListener('click', () => document.body.classList.add('sb-show'));
    quick.insertBefore(b, quick.firstChild);
  };
  document.addEventListener('click', (e) => { if (document.body.classList.contains('sb-show') && !e.target.closest('.sb') && !e.target.closest('.sb-open')) document.body.classList.remove('sb-show'); });
  const syncHeight = () => {
    const tb = document.querySelector('.topbar');
    if (!tb) return;
    const root = document.documentElement.style, q = tb.querySelector('.quick');
    root.setProperty('--tb-h', tb.getBoundingClientRect().bottom + 'px');
    if (q) { const r = q.getBoundingClientRect(); root.setProperty('--q-mid', (r.top + r.height / 2) + 'px'); }
  };
  window.addEventListener('resize', syncHeight);
  const start = () => {
    const nav = document.querySelector('.topbar .nav');
    if (!nav) return setTimeout(start, 50);
    if (!document.querySelector('.sb')) build(nav);
    addOpenBtn();
    // The Dashboard redraws its top bar; put the menu button back if it disappears.
    setInterval(() => { addOpenBtn(); syncHeight(); }, 500);
    syncHeight();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
