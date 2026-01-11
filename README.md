## t-rex-runner

the trex runner game extracted from chrome offline err page.

see the [source](https://cs.chromium.org/chromium/src/components/neterror/resources/offline.js?q=t-rex+package:%5Echromium$&dr=C&l=7) from chromium

[go and enjoy! :smile: ](http://wayou.github.io/t-rex-runner/)

## Leaderboard (Supabase)

This repo includes a simple leaderboard:

- player enters a name (stored in `localStorage`)
- on game over, the score is submitted to a Supabase Edge Function
- the overlay shows Top 10 (score desc)

### 1) Create table + policies

In Supabase SQL editor, run `supabase/supabase.sql`.

This sets the `scores` table to **public read-only** (SELECT only).

### 2) Configure client (anon key only)

Edit `index.html` and set:

- `window.TREX_SUPABASE_URL`
- `window.TREX_SUPABASE_ANON_KEY`

Do **not** use the service role key in the browser.

### 3) Deploy Edge Function (server-side insert)

Deploy `submit-score`, and set the secret used for server-side inserts:

- secret: `SUPABASE_SERVICE_ROLE_KEY`

If you use Supabase CLI, typical commands are:

- `supabase functions deploy submit-score --no-verify-jwt`
- `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`
