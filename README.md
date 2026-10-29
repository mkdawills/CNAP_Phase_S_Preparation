# CNAP Phase S Proposal Hub

Internal hub for the CNAP Center COBRE-S (Phase S) application, PAR-27-055.

Plain static site: open `index.html`. No build step.

- `index.html`: Dashboard (countdown, completion tracker, stages)
- One `.html` file per tab and per contributor
- `site.css`: shared styles
- `progress.json`: completion counts shown on the Dashboard (a snapshot from Smartsheet)
- `Progress.html`: Update Progress page; saves statuses to Smartsheet through the relay in `worker/`
- `hub-config.js`: the relay's address (empty until it is set up; see `worker/README.md`)
- `assets/cnap-logo.jpg`: logo

Smartsheet is the live source for assignments, dates and statuses.
