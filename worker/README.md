# Progress relay (Cloudflare Worker)

Lets the team change an assignment's **Progress** status on the hub's
**Update Progress** page (`Progress.html`) instead of in Smartsheet. The
website can't hold the Smartsheet token safely, so this small free service
holds it and makes the change in Smartsheet for the site.

It also gives the Dashboard live status counts. Until it is set up, the
Dashboard keeps using `progress.json`, which GitHub refreshes twice each weekday.

## One-time setup (about 15 minutes)

You need Node.js installed, a free Cloudflare account, and the Smartsheet API
token (the same one stored in GitHub as `SMARTSHEET_TOKEN`).

1. In a terminal, from this `worker` folder, sign in to Cloudflare:

   ```bash
   npx wrangler login
   ```

2. Store the Smartsheet token (paste it when asked):

   ```bash
   npx wrangler secret put SMARTSHEET_TOKEN
   ```

3. Choose a team passcode and store it (paste it when asked):

   ```bash
   npx wrangler secret put TEAM_PASSCODE
   ```

4. Check that `ALLOWED_ORIGINS` in `wrangler.toml` is the hub's web address
   (scheme and host only, for example `https://mkdawills.github.io`), then publish:

   ```bash
   npx wrangler deploy
   ```

   The last lines print the service's address, like
   `https://cnap-progress.<your-subdomain>.workers.dev`.

5. Put that address in `hub-config.js` at the top of the repository:

   ```js
   window.CNAP_API = "https://cnap-progress.<your-subdomain>.workers.dev";
   ```

   Commit and push. The Update Progress page and live Dashboard counts then work.

6. Share the passcode with the team. Each browser asks for it once.

## Changing the passcode

Run `npx wrangler secret put TEAM_PASSCODE` again. Everyone is asked for the new one
the next time they save a change.

## Notes

- Only the Progress column can be changed, and only to one of the five statuses.
- Smartsheet records the token's owner as the editor for changes made through the hub.
