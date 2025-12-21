## t-rex-runner

the trex runner game extracted from chrome offline err page.

see the [source](https://cs.chromium.org/chromium/src/components/neterror/resources/offline.js?q=t-rex+package:%5Echromium$&dr=C&l=7) from chromium

[go and enjoy! :smile: ](http://wayou.github.io/t-rex-runner/)

## Leaderboard (Supabase)

This repo includes a simple client-only leaderboard:

- player enters a name (stored in `localStorage`)
- on game over, the score is inserted into Supabase
- the overlay shows Top 10 (score desc)

### 1) Create table + policies

In Supabase SQL editor, run `supabase.sql`.

### 2) Configure client (anon key only)

Edit `index.html` and set:

- `window.TREX_SUPABASE_URL`
- `window.TREX_SUPABASE_ANON_KEY`

Do **not** use the service role key in the browser.
