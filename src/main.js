/**
 * main.js — bootstrap / composition root.
 *
 * The ONE place that knows about concrete implementations. It builds the
 * services, wires them into a shared `ctx`, registers the states on the
 * machine, and starts the fixed-timestep loop. Swapping DomRenderer for a
 * Canvas renderer, or NoopAdService for ImaAdService (Day 4), happens only here.
 */
(function () {
  'use strict';

  var Config = App.Config;

  function boot() {
    var sceneEl = document.getElementById('scene');
    var hudEl = document.getElementById('hud');
    var playfieldEl = document.getElementById('playfield');
    var uiLayerEl = document.getElementById('ui-layer');

    sceneEl.style.width = Config.SCENE_WIDTH + 'px';
    sceneEl.style.height = Config.SCENE_HEIGHT + 'px';
    playfieldEl.style.width = Config.PLAYFIELD_WIDTH + 'px';
    playfieldEl.style.height = Config.PLAYFIELD_HEIGHT + 'px';

    // --- Services ------------------------------------------------------------
    var emitter = new App.EventEmitter();

    var renderer = new App.DomRenderer(playfieldEl);
    renderer.init();
    renderer.clear();

    var input = new App.InputController(emitter);
    input.attach();

    var hud = new App.Hud(hudEl);
    var dialog = new App.Dialog(uiLayerEl);
    var game = new App.SnakeGame();
    var highScore = new App.HighScore(Config.HISCORE_KEY);

    // Real ads via Google IMA. The service fails gracefully (missing SDK /
    // adblock / error / empty VAST / hung load) so the game never gets stuck;
    // swap for App.NoopAdService here to disable ads entirely.
    var adService = new App.ImaAdService({
      overlayEl: document.getElementById('ad-overlay'),
      videoEl: document.getElementById('ad-video'),
      adContainerEl: document.getElementById('ad-container'),
      adTagUrl: Config.AD_TAG_URL,
      width: Config.SCENE_WIDTH,
      height: Config.SCENE_HEIGHT
    });

    var machine = new App.StateMachine();

    // Shared service bag passed to every state (manual DI).
    var ctx = {
      machine: machine,
      renderer: renderer,
      hud: hud,
      dialog: dialog,
      game: game,
      highScore: highScore,
      adService: adService,
      redirect: function () {
        window.location.href = Config.REDIRECT_URL;
      }
    };

    // --- States --------------------------------------------------------------
    machine.add(Config.STATE_START, new App.StartState(ctx));
    machine.add(Config.STATE_AD, new App.AdState(ctx));
    machine.add(Config.STATE_PLAYING, new App.PlayingState(ctx));
    machine.add(Config.STATE_GAMEOVER, new App.GameOverState(ctx));

    // --- Input routing -------------------------------------------------------
    emitter.on('command', function (command) {
      machine.handleCommand(command);
    });

    // --- Fixed-timestep loop -------------------------------------------------
    var loop = new App.GameLoop({
      stepMs: Config.LOOP_STEP_MS,
      onUpdate: function (stepMs) { machine.update(stepMs); },
      onRender: function (alpha) { machine.render(alpha); }
    });

    machine.change(Config.STATE_START);
    loop.start();

    // After a "No" redirect, pressing the browser Back button can restore this
    // page from the back-forward cache WITHOUT re-running scripts — leaving the
    // FSM frozen wherever it was (no dialog). Reset the flow to START on bfcache
    // restore so the player always lands back on "Play Snake?".
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) {
        machine.change(Config.STATE_START);
      }
    });

    App._debug = { emitter: emitter, machine: machine, game: game, loop: loop };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
