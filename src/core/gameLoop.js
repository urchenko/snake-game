/**
 * GameLoop — fixed-timestep loop on top of requestAnimationFrame.
 *
 * Decouples simulation rate from rendering / display FPS using an accumulator:
 * regardless of frame rate, `onUpdate(stepMs)` is called with a constant step,
 * so game speed is deterministic. `onRender(alpha)` is called once per frame,
 * where `alpha` is the fractional progress toward the next step (for optional
 * interpolation).
 *
 * The loop itself is generic — it knows nothing about the snake. The snake's
 * own move cadence is handled by the playing state via its own ms accumulator.
 */
var App = App || {};

App.GameLoop = (function () {
  'use strict';

  var MAX_FRAME_MS = 250; // clamp huge gaps (tab was backgrounded) to avoid spiral-of-death

  var now = (typeof window !== 'undefined' && window.performance && window.performance.now)
    ? function () { return window.performance.now(); }
    : function () { return Date.now(); };

  /**
   * @param {{ stepMs:number=, onUpdate:Function=, onRender:Function= }} opts
   */
  function GameLoop(opts) {
    opts = opts || {};
    this._step = opts.stepMs || (1000 / 60);
    this._onUpdate = opts.onUpdate || function () {};
    this._onRender = opts.onRender || function () {};

    this._running = false;
    this._accumulator = 0;
    this._last = 0;
    this._rafId = null;

    var self = this;
    this._frame = function () { self._tick(); };
  }

  /** Start the loop (no-op if already running). */
  GameLoop.prototype.start = function () {
    if (this._running) {
      return;
    }
    this._running = true;
    this._accumulator = 0;
    this._last = now();
    this._rafId = window.requestAnimationFrame(this._frame);
  };

  /** Stop the loop and release the rAF handle. */
  GameLoop.prototype.stop = function () {
    this._running = false;
    if (this._rafId !== null) {
      window.cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  };

  GameLoop.prototype.isRunning = function () {
    return this._running;
  };

  GameLoop.prototype._tick = function () {
    if (!this._running) {
      return;
    }

    var current = now();
    var frameMs = current - this._last;
    this._last = current;
    if (frameMs > MAX_FRAME_MS) {
      frameMs = MAX_FRAME_MS;
    }

    this._accumulator += frameMs;
    while (this._accumulator >= this._step) {
      this._onUpdate(this._step);
      this._accumulator -= this._step;
    }

    this._onRender(this._accumulator / this._step);

    this._rafId = window.requestAnimationFrame(this._frame);
  };

  return GameLoop;
})();
