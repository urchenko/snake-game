/**
 * Global configuration / constants.
 *
 * Single source of truth for sizes, speed, colors and external URLs.
 * No "magic numbers" elsewhere in the codebase — everything tunable lives here.
 *
 * Exposed as App.Config on a single global namespace (no ES modules in ES5).
 */
var App = App || {};

App.Config = (function () {
  'use strict';

  var CELL = 40;          // cell size in px (square)
  var COLS = 32;          // playfield width  in cells -> 32 * 40 = 1280
  var ROWS = 16;          // playfield height in cells -> 16 * 40 = 640
  var HUD_H = 80;         // top HUD band height in px -> 640 + 80 = 720

  return {
    /* Scene (fixed, per the brief — no responsive scaling, just centered). */
    SCENE_WIDTH: 1280,
    SCENE_HEIGHT: 720,

    /* Playfield grid. */
    CELL: CELL,
    COLS: COLS,
    ROWS: ROWS,
    HUD_HEIGHT: HUD_H,
    PLAYFIELD_WIDTH: COLS * CELL,
    PLAYFIELD_HEIGHT: ROWS * CELL,

    /* Game loop / speed.
     * Fixed timestep for the loop; snake moves on its own ms accumulator. */
    LOOP_STEP_MS: 1000 / 60,   // fixed update step fed to states
    START_SPEED_MS: 160,       // ms between snake moves at game start (~6.25/s)
    MIN_SPEED_MS: 70,          // fastest allowed (speed cap)
    SPEED_STEP_MS: 2,          // sped up by this much each time food is eaten
    SPEED_UP: true,            // toggle acceleration on/off

    /* Snake start. */
    START_LENGTH: 3,           // initial body length

    /* Ready countdown before the snake starts moving (e.g. after an ad).
     * ms shown per item ('3','2','1','Go!'); 0 disables the countdown. */
    COUNTDOWN_STEP_MS: 500,

    /* Food placement: bias spawns toward open cells (weight = free neighbours + 1).
     * false = classic uniform-random. */
    FOOD_OPENNESS_WEIGHTING: true,

    /* Direction vectors (grid space: +y is down). Reusable across input/domain. */
    DIR_UP: { x: 0, y: -1 },
    DIR_DOWN: { x: 0, y: 1 },
    DIR_LEFT: { x: -1, y: 0 },
    DIR_RIGHT: { x: 1, y: 0 },

    /* Cell render types (renderer-agnostic semantic names). */
    CELL_EMPTY: 'empty',
    CELL_SNAKE: 'snake',
    CELL_HEAD: 'head',
    CELL_FOOD: 'food',

    /* Input commands (semantic, decoupled from raw key codes). */
    CMD_UP: 'UP',
    CMD_DOWN: 'DOWN',
    CMD_LEFT: 'LEFT',
    CMD_RIGHT: 'RIGHT',
    CMD_CONFIRM: 'CONFIRM',
    CMD_CANCEL: 'CANCEL',

    /* State machine state names (game flow). */
    STATE_START: 'start',
    STATE_AD: 'ad',
    STATE_PLAYING: 'playing',
    STATE_GAMEOVER: 'gameover',

    /* localStorage keys. */
    HISCORE_KEY: 'snake.hiscore',
    MUTE_KEY: 'snake.muted',

    /* External resource on "No" / decline. Replace with google.com / wikipedia.org if desired. */
    REDIRECT_URL: 'https://play.works',

    /* Google IMA test VAST tag. Sample tags:
     * https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/tags
     *
     * The default below (sample_ct=linear) usually serves a VPAID creative whose
     * player script needs to run in IMA's friendly iframe; locally that iframe can
     * be sandboxed without 'allow-scripts', so the video may not paint (the SDK
     * countdown still shows). For a plain VAST with a directly-played MP4 — which
     * renders reliably in local testing — use the "skippablelinear" sample instead
     * (swap the commented lines). Either way the flow is identical and the ad
     * fails/ends gracefully. */
    AD_TAG_URL: 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=',
    // AD_TAG_URL: 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dskippablelinear&ciu_szs=300x250&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=',

    /* Watchdog: if the ad hasn't STARTED within this window (SDK missing, network
     * hang, adblock, empty VAST), give up and resume the game gracefully. */
    AD_LOAD_TIMEOUT_MS: 8000,

    /* Hard safety cap on the whole ad from start of playback. Generous so it
     * never cuts a real ad, but guarantees a broken/hung creative (e.g. a VPAID
     * player whose script can't run) can't freeze the game. */
    AD_MAX_DURATION_MS: 60000,

    /* Log the IMA ad lifecycle to the console ([ads] ...) for diagnosis.
     * Off by default for a clean console; flip to true to trace ad playback. */
    AD_DEBUG: false
  };
})();
