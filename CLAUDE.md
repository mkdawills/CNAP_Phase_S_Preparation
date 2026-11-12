# CNAP Phase S Proposal Hub: notes for Claude

The team website for preparing the CNAP Center's COBRE Phase S (Sustainability) application to NIH (PAR-27-055).
Morgan Wills (Proposal Coordinator, mkwills@ksu.edu) maintains it. Heather Bailey is Center Director (PD/PI).

- Live site: https://mkdawills.github.io/CNAP_Phase_S_Preparation/ (GitHub Pages from `main`).
- Commit and push changes straight to `main`. Morgan has asked for this.
- Key dates: internal deadline (application complete) Fri, Jan 15, 2027. NIH due Mon, Jan 25, 2027, 5:00 PM.

## How the pieces fit

- **Static site.** Plain HTML pages plus `site.css`, `sidebar.css`/`sidebar.js` (side menu built from each page's `.topbar .nav`), and inline per-page styles. No build step.
- **Smartsheet** is the source of truth for assignments: sheet `4867656760119172`, "Phase S Assignments, Resources, Progress". Use the Smartsheet connector.
  - Key columns: Progress (statuses), Responsible (text), Assignment (no numbering), Internal Due Date, Proposal Section, Passed to (contact), Handoff note, Last passed (hidden time stamp), 1. Working Draft Folder / 2. Final Version folder (picklists whose cells carry Dropbox hyperlinks).
  - Responsible uses first names joined with "/": `Heather/ Morgan`, `Chip/Heather`, `Chip/Heather/Roxana`, `Carl Ade`, `Carl Ade/Roxana`, `Doina/Roxana`. The progress widget splits on "/" and matches exact names, and the reminder automations match "contains <first name>".
- **Google Apps Script relay** (`apps-script/Code.gs`, deployed by Morgan from her Google account; the URL is in `hub-config.js`) lets the site read and set statuses without a Smartsheet login. The Smartsheet token lives only in the script's Script Properties. After any change to Code.gs, give Morgan the full script and the redeploy steps: Deploy → Manage deployments → pencil → New version → Deploy.
- **`progress-widget.js`** draws the status labels, "Your status" dropdowns, "Passed to you", and the status lists. Elements:
  - `details.acc[data-rows="rowId,rowId"]` on assignments;
  - `.cnap-progress[data-who]` (with `data-rest="1"` for the "More assignments to update" safety net);
  - `.cnap-passed[data-name]`.

  When you change it, bump the `?v=` query on every page.
- **Dashboard** (`index.html`) renders from a template and re-renders every second; `progress.json` is refreshed by a scheduled job.
- **Calendar files** in `cal/*.ics` hold each person's due dates. Keep them in step with the pages: CRLF line endings, lines folded at 75 octets.
- **Smartsheet automations:**
  - 7-day, 2-day, and past-due check-in reminders per person. None fall on a weekend: the 2-day ones use the hidden "2-Day Reminder Date" column (weekend → Friday before), and the check-ins and the past-due alert use the hidden "Check-in Date" column (next weekday after the due date);
  - "Ready for Review" and past-due alerts to Morgan and Heather;
  - "assignment passed to you", which fires on changes to Last passed.

  Reminders only reach people the sheet is shared with; everyone on the team is shared as a Viewer.

## People and components

| Component | Who |
|---|---|
| Center (Overall) | Heather Bailey + Morgan |
| Admin Core | Heather Bailey + Morgan |
| Neuroscience Core (formerly the BN and CN Cores, merged Nov 10, 2026) | Chip Pickens, Core Director, + Heather Bailey |
| NI Core | Doina Caragea |
| SRP Core | Carl Ade (SRP Core Director; Associate Director is a CNAP role, not Senior/Key) |
| Budget review | Roxana Ortiz, then Tim McDaniel (Central Office) |
| Biosketch review | Kim Rewinkel (Central Office) |

That makes four cores plus the Center: five components. Tim and Kim review through the formal Central Office process and are not in the "Pass to" list.

O&M Plan (Center Research Strategy B): Heather drafted the Research Cores' parts herself (Nov 12, 2026). Chip and Doina review her drafts and edit as they like by Wed, Nov 18; they no longer write their own input. Her drafts are in WORKING DRAFTS › Center, and both rows' Working Draft Folder now points there. The Smartsheet rows are named "Core lead review of Heather's draft".

Old BN Core and CN Core Dropbox WORKING DRAFTS folders stay linked as "earlier drafts"; new work goes in the Neuroscience Core folders.

## Working conventions

- **Style:** quiet gray design, low cognitive load, little rounding. Use gentle, plain wording, never harsh. Write dates as "Fri, Dec 18".
- **Sweep the whole site after any change:**
  - every page, including menus in every page;
  - the Timeline (both the date list and the by-component grid);
  - the Dashboard, the budget and biosketch tables (Roxana, Tim, Kim), Workflow, FAQ, and Conventions;
  - the calendar files and the Smartsheet text.
- **Test** with Playwright against `python3 -m http.server 8765`, mocking `hub-config.js` and the API. Give mock rows a `section` field and an `Access-Control-Allow-Origin` header.
- **Ask Morgan first** before deleting Smartsheet rows; save a backup of their contents. Also ask before changing who is responsible for something.
