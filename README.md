# CNAP Phase S Proposal Hub

Internal hub for the CNAP Center COBRE-S (Phase S) application, PAR-27-055.

Plain static site: open `index.html`. No build step.

- `index.html`: Dashboard (countdown, completion tracker, stages)
- One `.html` file per tab and per contributor
- `site.css`: shared styles
- `sidebar.css` + `sidebar.js`: the gray side menu, built from each page's own top-menu HTML (edit the menu there)
- `progress.json`: completion counts shown on the Dashboard (a snapshot from Smartsheet)
- `Progress.html`: Update Progress page (everyone); saves statuses to Smartsheet through the Google Apps Script relay in `apps-script/`
- `progress-widget.js`: the status dropdowns, used on `Progress.html` and on each guidance page ("Update your progress")
- `hub-config.js`: the relay's address (empty until it is set up; see `apps-script/README.md`)
- `assets/cnap-logo.jpg`: logo

Smartsheet is the live source for assignments, dates and statuses.
