/**
 * PlayingState — the actual Snake gameplay.
 *
 * Owns the per-tick simulation and the delta render. The snake advances on its
 * own ms accumulator keyed to game.speedMs(), independent of display FPS.
 * Domain events drive transitions: gameOver/win -> GAMEOVER (no polling).
 *
 * Subscribes to game events on enter() and unsubscribes on exit() so handlers
 * never stack across repeated plays.
 */
var App = App || {};

App.PlayingState = (function () {
  'use strict';

  var Config = App.Config;

  // Semantic command -> direction vector.
  var DIRS = {};
  DIRS[Config.CMD_UP] = Config.DIR_UP;
  DIRS[Config.CMD_DOWN] = Config.DIR_DOWN;
  DIRS[Config.CMD_LEFT] = Config.DIR_LEFT;
  DIRS[Config.CMD_RIGHT] = Config.DIR_RIGHT;

  // Heading vector -> head facing variant (for the renderer).
  function headVariant(d) {
    if (!d) { return 'right'; }
    if (d.x > 0) { return 'right'; }
    if (d.x < 0) { return 'left'; }
    if (d.y > 0) { return 'down'; }
    return 'up';
  }

  /**
   * @param {Object} ctx shared services (machine, renderer, hud, game, ...)
   */
  function PlayingState(ctx) {
    this._ctx = ctx;
    this._acc = 0;
    this._paused = false;
    this._prev = { cells: [], food: null };

    var self = this;
    // Pause when the tab is hidden or the window loses focus, so the snake
    // doesn't keep moving (and doesn't fast-forward) while the player is away.
    this._onVisibility = function () {
      if (document.hidden) { self._pause(); } else { self._resume(); }
    };
    this._onBlur = function () { self._pause(); };
    this._onFocus = function () { self._resume(); };

    this._onAte = function (p) {
      self._ctx.hud.setScore(p.score);
      self._ctx.hud.pulseScore();
      self._ctx.effects.flash();
      self._ctx.sound.play('eat');
    };
    this._onGameOver = function (p) {
      self._ctx.effects.shake();
      self._ctx.sound.play('death');
      self._recordBest(p.score);
      self._ctx.machine.change(Config.STATE_GAMEOVER, {
        score: p.score, reason: p.reason, won: false
      });
    };
    this._onWin = function (p) {
      self._ctx.effects.flash();
      self._ctx.sound.play('win');
      self._recordBest(p.score);
      self._ctx.machine.change(Config.STATE_GAMEOVER, {
        score: p.score, won: true
      });
    };
  }

  /** Persist the score if it's a new best, and refresh the HUD's "Best". */
  PlayingState.prototype._recordBest = function (score) {
    var best = this._ctx.highScore.submit(score);
    this._ctx.hud.setBest(best);
  };

  PlayingState.prototype.enter = function () {
    var ctx = this._ctx;
    ctx.game.events.on('ate', this._onAte);
    ctx.game.events.on('gameOver', this._onGameOver);
    ctx.game.events.on('win', this._onWin);

    document.addEventListener('visibilitychange', this._onVisibility, false);
    window.addEventListener('blur', this._onBlur, false);
    window.addEventListener('focus', this._onFocus, false);

    this._acc = 0;
    this._paused = false;
    this._prev = { cells: [], food: null };
    ctx.renderer.clear();
    ctx.hud.setStatus('');
    ctx.game.reset();
    ctx.hud.setScore(ctx.game.score());
    ctx.hud.setBest(ctx.highScore.get());
    this._render();
  };

  PlayingState.prototype.exit = function () {
    var ctx = this._ctx;
    ctx.game.events.off('ate', this._onAte);
    ctx.game.events.off('gameOver', this._onGameOver);
    ctx.game.events.off('win', this._onWin);

    document.removeEventListener('visibilitychange', this._onVisibility, false);
    window.removeEventListener('blur', this._onBlur, false);
    window.removeEventListener('focus', this._onFocus, false);
    ctx.hud.setStatus('');
  };

  PlayingState.prototype._pause = function () {
    if (this._paused) {
      return;
    }
    this._paused = true;
    this._ctx.hud.setStatus('Paused');
  };

  PlayingState.prototype._resume = function () {
    if (!this._paused) {
      return;
    }
    this._paused = false;
    this._acc = 0; // drop time accrued while away — no fast-forward
    this._ctx.hud.setStatus('');
  };

  PlayingState.prototype.handleCommand = function (command) {
    var dir = DIRS[command];
    if (dir) {
      this._ctx.game.setDirection(dir);
    }
  };

  PlayingState.prototype.update = function (stepMs) {
    var game = this._ctx.game;
    if (this._paused || game.isOver()) {
      return;
    }
    this._acc += stepMs;
    // Step as many times as the accumulated time allows; stop immediately if a
    // step ends the game (the gameOver/win handler has already transitioned).
    while (this._acc >= game.speedMs() && !game.isOver()) {
      game.step();
      this._acc -= game.speedMs();
    }
  };

  PlayingState.prototype.render = function () {
    this._render();
  };

  /** Minimal-DOM delta draw: erase vacated cells, paint snake + food. */
  PlayingState.prototype._render = function () {
    var renderer = this._ctx.renderer;
    var cells = this._ctx.game.snakeCells();
    var food = this._ctx.game.foodPosition();
    var prev = this._prev;

    var nextKeys = {};
    cells.forEach(function (c, i) {
      nextKeys[c.x + ',' + c.y] = (i === 0) ? Config.CELL_HEAD : Config.CELL_SNAKE;
    });

    prev.cells.forEach(function (c) {
      if (!nextKeys[c.x + ',' + c.y]) {
        renderer.clearCell(c.x, c.y);
      }
    });
    if (prev.food && (!food || prev.food.x !== food.x || prev.food.y !== food.y)) {
      if (!nextKeys[prev.food.x + ',' + prev.food.y]) {
        renderer.clearCell(prev.food.x, prev.food.y);
      }
    }

    var facing = headVariant(this._ctx.game.headDirection());
    cells.forEach(function (c, i) {
      if (i === 0) {
        renderer.drawCell(c.x, c.y, Config.CELL_HEAD, facing);
      } else {
        renderer.drawCell(c.x, c.y, Config.CELL_SNAKE);
      }
    });
    if (food) {
      renderer.drawCell(food.x, food.y, Config.CELL_FOOD);
    }

    prev.cells = cells.map(function (c) { return { x: c.x, y: c.y }; });
    prev.food = food ? { x: food.x, y: food.y } : null;
  };

  return PlayingState;
})();
