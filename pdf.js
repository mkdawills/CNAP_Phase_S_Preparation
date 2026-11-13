// "Download PDF" for the Team Timeline and the individualized guidance pages.
// Adds a button under the page heading. It opens the browser's print window with every
// section and assignment expanded; choosing "Save as PDF" there saves the file.
// The NOFO/NIH "For reference" text, the status controls, and repeated copies of the same
// guidance are left out to keep the PDF short.
// Pressing Ctrl+P (Cmd+P) on these pages gives the same result.
(function () {
  const head = document.querySelector('main .pagehead');
  if (!head) return;
  const isTimeline = /Timeline\.html$/i.test(location.pathname);

  const css = document.createElement('style');
  css.textContent = `
.pdf-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:14px 0 4px}
.pdf-bar .pdf-hint{font-size:13px;color:#6B6579}
.pdf-only{display:none}
@media print{
  @page{size:letter ${isTimeline ? 'landscape' : 'portrait'};margin:0.55in}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body,.hub{background:#fff !important}
  .topbar,.sb,.sb-edge,.sb-hint,.sb-open,.cx-all,.pdf-bar,.xall-bar,.xall,button,.st-box,.sub-acc,
  .sx-car,svg.car,.prog-badge,.no-print,select{display:none !important}
  .pdf-only{display:block !important;font-size:11px;color:#6B6579;margin:0 0 10px}
  main .wrap{max-width:none !important;padding-left:0 !important;padding-right:0 !important}
  .sec,.pagehead{padding-top:10px !important;padding-bottom:10px !important}
  .scroll{overflow:visible !important}
  table{min-width:0 !important;width:100% !important}
  ${isTimeline ? 'table.bc,table.kl{font-size:10.5px}' : ''}
  .stat,.blk,.rule,tr,summary,.card.tight,.quote{break-inside:avoid}
  h1,h2,h3,h4,summary{break-after:avoid}
  a{color:inherit !important;text-decoration:none !important}
  details.sx > summary .h2{background-image:none !important}
  details.stg > summary > div::after{display:none !important}
  a.btn{box-shadow:none !important}
}`;
  document.head.appendChild(css);

  const bar = document.createElement('div');
  bar.className = 'pdf-bar';
  bar.innerHTML = '<button type="button" class="btn sm pdf-btn">Download PDF</button>' +
    '<span class="pdf-hint">Opens your print window; choose &ldquo;Save as PDF&rdquo; as the destination.</span>';
  const anchor = head.querySelector('.lede') || head.querySelector('h1');
  anchor.insertAdjacentElement('afterend', bar);

  // A dated line that shows only in the PDF, so a saved copy says when it was made.
  const stamp = document.createElement('p');
  stamp.className = 'pdf-only';
  head.insertAdjacentElement('afterbegin', stamp);

  // Sections that exist only to update statuses don't belong in a PDF.
  document.querySelectorAll('.cnap-passed, .cnap-progress[data-rest]').forEach((el) => {
    const s = el.closest('section'); if (s) s.classList.add('no-print');
  });

  let opened = [], oldTitle = '';
  const fmt = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const before = () => {
    if (opened.length) return;
    document.querySelectorAll('main details').forEach((d) => {
      if (d.classList.contains('sub-acc') || d.closest('.sub-acc')) return;
      // Repeated copies ("Uses the same guidance as task 2") print as their title and date only.
      if (d.querySelector(':scope > .body > .same-note')) return;
      if (!d.open) { d.open = true; opened.push(d); }
    });
    const name = (head.querySelector('h1') || {}).textContent || 'CNAP Phase S';
    stamp.textContent = 'CNAP Phase S Proposal Hub · ' + location.href.split('#')[0] + ' · saved ' + fmt(new Date());
    oldTitle = document.title;
    // Browsers use the page title as the suggested PDF file name.
    document.title = 'CNAP Phase S - ' + name.trim().replace(/^Dr\.\s+|^Mr\.\s+|^Ms\.\s+/, '') + ' - ' +
      new Date().toISOString().slice(0, 10);
  };
  const after = () => {
    opened.forEach((d) => { d.open = false; }); opened = [];
    if (oldTitle) { document.title = oldTitle; oldTitle = ''; }
  };
  window.addEventListener('beforeprint', before);
  window.addEventListener('afterprint', after);
  bar.querySelector('.pdf-btn').addEventListener('click', () => { before(); setTimeout(() => window.print(), 60); });
})();
