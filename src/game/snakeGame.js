/**
 * SnakeGame — rules orchestrator. Pure domain: NO DOM, NO input, NO ads.
 *
 * Owns the board, snake, food, score and current speed, and advances the
 * simulation one tick at a time via step(). Outcomes are published as events
 * through its own EventEmitter so the presentation layer can react without the
 * domain knowing anything about it:
 *   'ate'      payload: { score, speedMs }
 *   'gameOver' payload: { score, reason: 'wall'|'self' }
 *   'win'      payload: { score }
 *
 * Direction is set with a grid vector (Config.DIR_*); the snake itself enforces
 * the no-180° rule and one-turn buffering.
 */
var App = App || {};

App.SnakeGame = (function () {
  'use strict';

  var Config = App.Config;

  /**
   * @param {Object=} options overrides (cols, rows, startLength, startSpeedMs,
   *                  minSpeedMs, speedStepMs, speedUp). Defaults from Config.
   */
  function SnakeGame(options) {
    options = options || {};
    this._cols = options.cols || Config.COLS;
    this._rows = options.rows || Config.ROWS;
    this._startLength = options.startLength || Config.START_LENGTH;
    this._startSpeedMs = options.startSpeedMs || Config.START_SPEED_MS;
    this._minSpeedMs = options.minSpeedMs || Config.MIN_SPEED_MS;
    this._speedStepMs = options.speedStepMs || Config.SPEED_STEP_MS;
    this._speedUp = options.speedUp !== undefined ? options.speedUp : Config.SPEED_UP;

    this.events = new App.EventEmitter();

    this._board = new App.Board(this._cols, this._rows);
    this._snake = null;
    this._food = new App.Food();
    this._score = 0;
    this._speedMs = this._startSpeedMs;
    this._over = false;
    this._won = false;
  }

  /** Start a fresh game: snake centered heading right, food placed, score 0. */
  SnakeGame.prototype.reset = function () {
    var headX = Math.floor(this._cols / 2);
    var headY = Math.floor(this._rows / 2);
    this._snake = new App.Snake(headX, headY, this._startLength, Config.DIR_RIGHT);
    this._food.respawn(this._board, this._snake);
    this._score = 0;
    this._speedMs = this._startSpeedMs;
    this._over = false;
    this._won = false;
  };

  /**
   * Queue a heading change for the next step.
   * @param {{x:number,y:number}} vector one of Config.DIR_*
   */
  SnakeGame.prototype.setDirection = function (vector) {
    if (this._over) {
      return;
    }
    this._snake.setDirection(vector);
  };

  /**
   * Advance the simulation by one tick and resolve the outcome.
   * No-op once the game is over.
   */
  SnakeGame.prototype.step = function () {
    if (this._over) {
      return;
    }

    var nextHead = this._snake.nextHead();

    // Wall collision (classic: no wrap).
    if (!this._board.isInside(nextHead.x, nextHead.y)) {
      this._endGame('wall');
      return;
    }

    var food = this._food.position();
    var grow = !!food && nextHead.x === food.x && nextHead.y === food.y;

    // Self collision (tail is allowed to vacate when not growing).
    if (this._snake.willCollide(nextHead, grow)) {
      this._endGame('self');
      return;
    }

    this._snake.move(grow);

    if (grow) {
      this._score += 1;
      if (this._speedUp && this._speedMs > this._minSpeedMs) {
        this._speedMs = Math.max(this._minSpeedMs, this._speedMs - this._speedStepMs);
      }

      var spot = this._food.respawn(this._board, this._snake);
      if (spot === null) {
        // No free cell remains: the board is full.
        this._won = true;
        this._over = true;
        this.events.emit('win', { score: this._score });
        return;
      }
      this.events.emit('ate', { score: this._score, speedMs: this._speedMs });
    }
  };

  SnakeGame.prototype._endGame = function (reason) {
    this._over = true;
    this.events.emit('gameOver', { score: this._score, reason: reason });
  };

  /* --- Read-only accessors for the presentation layer --------------------- */

  SnakeGame.prototype.isOver = function () { return this._over; };
  SnakeGame.prototype.isWon = function () { return this._won; };
  SnakeGame.prototype.score = function () { return this._score; };
  SnakeGame.prototype.speedMs = function () { return this._speedMs; };
  SnakeGame.prototype.snakeCells = function () { return this._snake.cells(); };
  SnakeGame.prototype.foodPosition = function () { return this._food.position(); };
  SnakeGame.prototype.headDirection = function () { return this._snake.direction(); };

  return SnakeGame;
})();
