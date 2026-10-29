# Progress relay (Google Apps Script)

Lets the team change an assignment's **Progress** status from the hub (each
guidance page's "Update your progress" section, and the everyone page
`Progress.html`) instead of in Smartsheet. The website can't hold the
Smartsheet token safely, so this small script holds it and makes the change
in Smartsheet for the site.

It runs under one Google account (whoever sets it up). Nobody else on the team
needs a Google account; they just enter the team passcode once.

It also gives the Dashboard live status counts. Until it is set up, the
Dashboard keeps using `progress.json`, which GitHub refreshes twice each weekday.

## One-time setup (about 10 minutes, all in the browser)

You need the Smartsheet API token (the same one stored in GitHub as
`SMARTSHEET_TOKEN`).

1. Go to <https://script.google.com> and click **New project**. Click
   "Untitled project" at the top and name it `CNAP Progress relay`.
2. Delete everything in the `Code.gs` editor, paste in the whole contents of
   `apps-script/Code.gs` from this repository, and click the save icon.
3. Click the gear (**Project Settings**) on the left. Under **Script
   Properties**, click **Add script property** twice and add:
   - `SMARTSHEET_TOKEN`: the Smartsheet token
   - `TEAM_PASSCODE`: a passcode you choose for the team

   Click **Save script properties**.
4. Back in the editor (`< >` on the left), choose `testSetup` in the function
   menu next to **Run**, then click **Run**. Google asks you to authorize the
   script: choose your account, click **Advanced**, then **Go to CNAP Progress
   relay (unsafe)**, then **Allow**. (Google shows this warning for any
   script that hasn't been through Google's review; this one only talks to
   Smartsheet.) The log should say something like `Read 92 rows`.
5. Click **Deploy** > **New deployment**. Click the gear next to "Select type"
   and choose **Web app**. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone

   Click **Deploy**, and copy the **Web app URL** (it ends in `/exec`).
6. Put that URL in `hub-config.js` at the top of the repository (or send it to
   Morgan / Claude to add):

   ```js
   window.CNAP_API = "https://script.google.com/macros/s/…/exec";
   ```

   Once that's pushed, the status dropdowns and live Dashboard counts work.
7. Share the passcode with the team. Each browser asks for it once.

If **Who has access** doesn't offer plain "Anyone" (only "Anyone within
your organization"), your Google Workspace admin has restricted it. Set it up
from a personal Google account instead.

## Changing the passcode

Edit `TEAM_PASSCODE` in **Project Settings** > **Script Properties**. Everyone
is asked for the new one the next time they save a change. No redeploy needed.

## Updating the script later

After pasting new code, use **Deploy** > **Manage deployments**, click the
pencil, set **Version** to **New version**, and click **Deploy**. That keeps
the same web address, so `hub-config.js` doesn't change.

## Notes

- Only the Progress column can be changed, and only to one of the five statuses.
- Smartsheet records the token's owner as the editor for changes made through the hub.
