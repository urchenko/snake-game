# Snake + Google IMA — Play.Works test task

Classic **Snake** built as a single-page app in **pure ES5.1 JavaScript** (no frameworks, no
game engine), rendered with **Web DOM** behind a renderer abstraction, with **Google IMA**
test ads shown at two points in the flow. Fixed **1280×720** stage, targeted at fresh Chrome.

The emphasis is architecture and code quality: the game logic is isolated from how it is drawn,
how input arrives, and how ads play, so each of those can be swapped without touching the rest.

---

## Quick start

The IMA SDK requires the page to be served over **http(s)** (not `file://`), so use any static
server:

```bash
cd snake-playworks
npx http-server -p 8080 -c-1
#   or:  python -m http.server 8080
```

Open **http://localhost:8080** in Chrome.

Without a server (opening `index.html` directly) the game still runs, but ads fail gracefully
and are skipped. The same graceful skip happens with an ad blocker enabled or no network — the
game is always playable.

---

## Controls (exactly 6 keys)

| Key | In game | In menus / dialogs |
|---|---|---|
| `↑` `↓` `←` `→` | steer the snake | move the selection |
| `Enter` | — | **confirm** / **Yes** |
| `Backspace` | — | **Cancel** / **No** |

Input is captured once and turned into **semantic commands** (`UP/DOWN/LEFT/RIGHT/CONFIRM/CANCEL`);
nothing downstream sees raw key codes. Arrow and Backspace defaults (page scroll, browser
"back") are suppressed.

**Mouse / touch** works in menus: hover highlights a button, click/tap selects it — see
"Mouse / touch input" below.

---

## Game rules (classic; fixed assumptions)

The brief left rule details open, so the classic variant was chosen and fixed explicitly:

- Grid **32×16** cells at 40px (playfield 1280×640, HUD band 80px → 720 total).
- Constant game tick (~8 moves/s at start), **independent of display FPS**.
- 180° reversal is forbidden; one turn is buffered per tick for responsiveness.
- Food spawns in a random free cell, never inside the snake; eating grows the snake by 1 and
  scores 1.
- **Acceleration is on**: each food shortens the tick interval slightly (down to a floor).
- **Game over** on hitting a wall (no wrap-around) or the snake's own body.
- Filling the entire board is a **win** (reuses the "Play again?" prompt).

All of these live in [`src/config.js`](src/config.js) as named constants — no magic numbers
scattered around. Wrap-around walls and acceleration are toggles/easy edits (see below).

---

## Game flow (finite state machine)

```
                 Yes                       (snake)        death / win
  START ───────────────► AD ───► PLAYING ─────────────► GAME OVER
  "Play Snake?"          │         ▲                       │  "Play again?"
        │ No             │         └──── AD ◄────── Yes ───┤
        ▼                ▼                                 │ No
   redirect          (one ad)                              ▼
                                                        redirect
```

- Ads play **only** in the two `AD` transitions ("Yes" at start, "Yes" after game over) and
  never otherwise.
- "No" anywhere redirects to an external resource (`Config.REDIRECT_URL`, default
  `https://play.works` — swap for `google.com` / `wikipedia.org` if you prefer).
- All prompts are **custom DOM dialogs** (no `confirm()` / native `<dialog>`), driven by the
  same 6 keys.

---

## Architecture

Dependencies point inward toward the domain. The domain (Snake rules) knows nothing about the
DOM, input, or ads. `main.js` is the single composition root that wires concrete implementations
together (manual dependency injection) and is the only place that would change to swap one.

```
states/  (FSM: Start → Ad → Playing → GameOver)
   ├─ use → SnakeGame (domain: Board / Snake / Food, rules, score)  ── no DOM, no input, no ads
   ├─ use → Renderer     (abstraction)  ← DomRenderer   (Web DOM; Canvas/WebGL would slot in here)
   ├─ use → AdService    (abstraction)  ← ImaAdService / NoopAdService
   ├─ use → Dialog, Hud  (custom UI)
   └─ receive semantic commands from InputController (via EventEmitter)
core/:  EventEmitter (Observer) · GameLoop (fixed timestep) · StateMachine (State)
config.js: all constants
```

### Patterns and why

- **State machine** for the game flow — screens and their transitions are explicit and isolated;
  each state subscribes on `enter` and unsubscribes on `exit`, so there are no listener leaks.
- **Strategy / abstraction behind an interface** for `Renderer`, input, and `AdService`. This is
  the core signal of the task: it gives **Dependency Inversion** and **Open/Closed** — the DOM
  renderer can be replaced with a Canvas/WebGL one, and IMA with another ad provider, without
  changing the game.
- **Observer** (`EventEmitter`) — input emits commands; the domain emits `ate`/`gameOver`/`win`;
  the HUD and states react. Loose coupling, no polling.
- **Game loop with a fixed timestep** — an accumulator over `requestAnimationFrame` decouples
  simulation speed from frame rate, so the snake moves at a deterministic pace on any monitor.
- **Object Pool** for DOM cells — the grid's `<div>`s are created once and reused; only changed
  cells are touched.

### Why Web DOM (and why it doesn't matter to the game)

The brief asked for the DOM renderer. The risk with DOM rendering is performance, so:

- cells are **pooled** (created once, never recreated);
- updates are a **delta**: only the new head, the vacated tail, and the moved food are written;
- a **type cache** in the renderer turns redundant writes into no-ops;
- only `className`/background changes (paint), never geometry reads/writes — **no layout
  thrashing**.

Crucially, the game logic only ever calls `renderer.drawCell / clearCell / clear`. It has no
idea the cells are DOM nodes — see "Swapping the renderer" below.

---

## Project structure

```
index.html                  loads scripts in dependency order + the IMA SDK
css/styles.css              all styles (scene, HUD, cells, dialog, ad overlay) — no UI libraries
src/
  config.js                 constants: grid, speed, colors, redirect URL, ad tag, timeouts
  core/
    eventEmitter.js         Observer (on/off/emit)
    gameLoop.js             fixed-timestep loop over rAF
    stateMachine.js         explicit FSM
  render/
    renderer.js             abstract renderer contract
    domRenderer.js          Web DOM implementation (pooled cells, delta updates)
  input/
    inputController.js      keyboard → semantic commands
  game/
    board.js                grid model / free-cell lookup
    snake.js                body, buffered turn, 180° rejection, collision, move/grow
    food.js                 food position / respawn
    snakeGame.js            rules orchestrator; emits ate/gameOver/win
  ads/
    adService.js            AdService abstraction + NoopAdService (ads-off stand-in)
    imaAdService.js         Google IMA implementation
  ui/
    dialog.js               custom Yes/No modal
    hud.js                  score + status bar
  states/
    startState.js  adState.js  playingState.js  gameOverState.js
  main.js                   composition root (manual DI)
```

No bundler and no ES modules: files are plain `<script>` tags in `index.html`, ordered
bottom-up by dependency. Everything attaches to a single `App` namespace.

---

## Ad integration (Google IMA HTML5)

- The SDK is loaded from the official CDN
  (`https://imasdk.googleapis.com/js/sdkloader/ima3.js`).
- A **test VAST tag** is used (Google's sample linear preroll) — no ad account, no sign-up. It's
  a single constant, `Config.AD_TAG_URL`. Other sample tags:
  https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/tags
- The ad plays as an **overlay in the same window** — a full-stage `#ad-overlay` div (with its
  own `z-index`) over the board, plus the hidden `<video>` element IMA needs. When the ad ends,
  the overlay hides and control returns to the game.
- All IMA details are hidden behind the `AdService` contract: **`playAd(onFinished)`**. The game
  flow decides *when* to show an ad; `ImaAdService` only knows *how*.

### Error handling (the important part)

`onFinished` is guaranteed to fire **exactly once**, for every outcome, so the game can never get
stuck on an ad. Covered:

- normal completion (`ALL_ADS_COMPLETED` / `CONTENT_RESUME_REQUESTED`), skip, duplicate terminal
  events;
- `AD_ERROR` from the loader or the manager (network failure, empty VAST, playback error);
- the SDK not being present at all (ad blocker / load failure);
- a synchronous IMA throw during setup;
- a **load watchdog** (`Config.AD_LOAD_TIMEOUT_MS`) for a request that never resolves, cleared
  once the ad starts;
- a **hard duration cap** (`Config.AD_MAX_DURATION_MS`, generous) so even a creative that starts
  but never completes (e.g. a VPAID player whose script can't run, see below) can't freeze the
  flow.

In every case the overlay is hidden, the `AdsManager` is destroyed, and the flow continues to its
target state (start a game / new game).

`AdDisplayContainer.initialize()` is called inside the "Yes" `Enter` keydown call stack, i.e. a
real user gesture, so media playback is permitted by the browser. The request also sets
`setAdWillAutoPlay(true)` so the SDK serves/starts a creative that plays without a click.

### Local testing note (console messages)

When testing locally you may see, and can ignore: a `Cross-Origin-Opener-Policy` notice from
`imasdk.googleapis.com` (informational, from Google's CDN) and a `favicon.ico` 404. You may also
see **"Blocked script execution in 'about:blank' … sandboxed … 'allow-scripts' not set"** — IMA
runs Open-Measurement / VPAID creatives in a sandboxed friendly iframe, and locally that script
can be blocked. The SDK's countdown chrome still renders but a VPAID video may not paint. This is
environmental, not an integration bug: serve over `http://localhost` (or https), or switch
`AD_TAG_URL` to the commented **`sample_ct=skippablelinear`** tag, which is a plain VAST with a
directly-played MP4 that renders reliably. The duration cap above guarantees the game proceeds
regardless.

---

## Edge cases handled

- 180° self-reversal blocked even with two quick turns inside one tick (reversal is checked
  against the last *applied* direction, not the queued one).
- Food never spawns on the snake; board-full is a win rather than an impossible respawn.
- Pause on tab hidden **and** window blur, with no fast-forward on return (the loop also clamps
  large frame gaps).
- Input ignored during ads; repeated `Enter` in a dialog can't double-fire (the dialog closes
  before the transition).
- All listeners are added on `enter` and removed on `exit` — no leaks across replays.

---

## Configuration & extension

Everything below is in [`src/config.js`](src/config.js).

- **Grid / speed:** `COLS`, `ROWS`, `CELL`, `START_SPEED_MS`, `MIN_SPEED_MS`, `SPEED_STEP_MS`,
  `SPEED_UP`.
- **Redirect target:** `REDIRECT_URL`.
- **Ad tag / timeout:** `AD_TAG_URL`, `AD_LOAD_TIMEOUT_MS`.
- **Wrap-around walls** (a non-classic option): would be a small change in `SnakeGame.step` —
  instead of "outside → game over", wrap the head coordinate modulo the grid. Left out
  deliberately to keep the classic rule.

### Swapping the renderer to Canvas/WebGL

Implement the four methods of the `Renderer` contract
([`src/render/renderer.js`](src/render/renderer.js)) — `init`, `clear`, `drawCell(x,y,type)`,
`clearCell(x,y)` — in a `CanvasRenderer` that paints rectangles into a `<canvas>`, then change a
single line in `main.js`:

```js
var renderer = new App.CanvasRenderer(canvasEl); // instead of App.DomRenderer
```

No game, state, or input code changes — that's the point of the abstraction.

### Swapping the ad provider / disabling ads

`ImaAdService` and `NoopAdService` both implement `AdService.playAd(onFinished)`. Swap the one
line in `main.js` to disable ads (`new App.NoopAdService()`), or write another provider against
the same contract.

### Mouse / touch input

Used where it's actually natural: **menus**. The `Dialog` ([`src/ui/dialog.js`](src/ui/dialog.js))
handles mouse/touch on its own buttons — **hover highlights**, **click/tap selects** — sharing
the same `_index` as the keyboard so both stay in sync. The CSS re-enables `pointer-events` on
`.dialog__option` (the UI layer is otherwise click-through).

Steering the snake is **keyboard-only** by design. The target is desktop Chrome with a keyboard,
and dragging a mouse to steer a snake isn't a natural interaction; touch isn't a target platform.
A pointer/touch steering layer was prototyped and removed — but it's a clean **extension point**
if a touch target were ever needed: add a second source that emits the same directional commands
(`UP/DOWN/LEFT/RIGHT`) into the existing `EventEmitter` (the `'command'` event), with
`touch-action: none` on the scene and `pointercancel` handling so the browser doesn't claim the
gesture. No game/state code would change.

---

## Testing

The domain and the flow are pure enough to verify headlessly in Node (loaded into an isolated
`vm` context, no browser). During development these covered: movement, 180° rejection, wall/self
death, eat/grow/score, win, speed-up; the full FSM path including both ad scenarios and the "No"
redirects; and the IMA service's exactly-once `onFinished` across no-SDK, happy-path with
duplicate events, loader error, and watchdog. Real ad playback is verified manually in Chrome
over http(s) with the sample tag, and the adblock-on path is verified to skip gracefully.

---

## What I'd improve with more time

- A small test harness committed to the repo (the dev tests were throwaway scripts).
- Sound and a bit more game feel (eat flash, death shake), and a persistent high score.
- A `CanvasRenderer` to demonstrate the renderer swap end-to-end.
- Smarter food placement weighting and a brief countdown after an ad before the snake moves.

---

## Constraints honored

Pure **ECMAScript 5.1**, `'use strict'` in every module: constructor functions + prototypes,
IIFE/closures (module pattern), `var` only — no `let/const`, arrow functions, `class`, template
strings, destructuring, promises, or ES modules. No frameworks, no game engine, no native
controls. The only runtime dependency is the Google IMA SDK (an external library; our code stays
ES5 regardless of what it ships).
