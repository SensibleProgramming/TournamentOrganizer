# Netlify Setup

One-time manual steps to link this repo to Netlify (requires GitHub OAuth consent — can't be automated headlessly).

## Steps

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**.
2. Choose **GitHub** → authorize if prompted → select `SensibleProgramming/TournamentOrganizer`.
3. On the site config screen:
   - **Base directory**: `tournament-client`
   - **Build command**: leave as detected from `netlify.toml` (`npm ci --legacy-peer-deps && npm run build`)
   - **Publish directory**: leave as detected from `netlify.toml` (`dist/tournament-client/browser`)
4. **Site settings → Build & deploy → Branches → Production branch**: change from `main` to `dev`.
   - This is the actual switch that makes "merge to dev" trigger a production deploy.
5. Deploy previews / branch deploys: leave defaults on if wanted, doesn't affect the `dev` production trigger.
6. Trigger first deploy (push to `dev` or "Trigger deploy" button) and confirm it succeeds.

## Config already in repo

`netlify.toml` (repo root) — build command, publish dir, SPA fallback redirect (`/* → /index.html`, required for Angular Router deep links).

## Known gap

No backend is deployed anywhere yet, so `/api/*` calls will fail on the live site. Frontend degrades only partially today — see issue [#171](https://github.com/SensibleProgramming/TournamentOrganizer/issues/171).
