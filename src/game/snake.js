/**
 * Snake — the body and its movement. Pure data, no DOM, no input.
 *
 * Body is an array of {x,y} cells; index 0 is the head, last index is the tail.
 * Direction handling buffers exactly one queued turn and rejects 180° reversal:
 * the reversal check is made against the LAST APPLIED direction (not the queued
 * one), so pressing e.g. Up then Left within one tick cannot fold the snake.
 */
var App = App || {};

App.Snake = (function () {
  'use strict';

  /**
   * @param {number} headX
   * @param {number} headY
   * @param {number} length initial body length (>= 1)
   * @param {{x:number,y:number}} direction initial heading
   */
  function Snake(headX, headY, length, direction) {
    this._direction = { x: direction.x, y: direction.y };      // last applied
    this._nextDirection = { x: direction.x, y: direction.y };  // queued for next move

    // Build the body trailing away from the head, opposite the heading.
    this._cells = [];
    var i;
    for (i = 0; i < length; i++) {
      this._cells.push({
        x: headX - direction.x * i,
        y: headY - direction.y * i
      });
    }
  }

  function isOpposite(a, b) {
    return a.x === -b.x && a.y === -b.y;
  }

  /**
   * Queue a new heading for the next move. Ignored if it is zero or a direct
   * 180° reversal of the last applied direction.
   * @param {{x:number,y:number}} dir
   */
  Snake.prototype.setDirection = function (dir) {
    if (dir.x === 0 && dir.y === 0) {
      return;
    }
    if (isOpposite(dir, this._direction)) {
      return;
    }
    this._nextDirection = { x: dir.x, y: dir.y };
  };

  /** @returns {{x:number,y:number}} head cell (do not mutate). */
  Snake.prototype.head = function () {
    return this._cells[0];
  };

  /** @returns {{x:number,y:number}} tail cell (do not mutate). */
  Snake.prototype.tail = function () {
    return this._cells[this._cells.length - 1];
  };

  /** @returns {number} body length. */
  Snake.prototype.length = function () {
    return this._cells.length;
  };

  /** @returns {Array.<{x:number,y:number}>} body cells, head first (do not mutate). */
  Snake.prototype.cells = function () {
    return this._cells;
  };

  /** @returns {{x:number,y:number}} where the head would land next move. */
  Snake.prototype.nextHead = function () {
    var head = this._cells[0];
    return { x: head.x + this._nextDirection.x, y: head.y + this._nextDirection.y };
  };

  /**
   * Would the head collide with the body if it moved to `point` this tick?
   * When not growing, the tail vacates its cell, so landing on the current tail
   * is allowed.
   * @param {{x:number,y:number}} point
   * @param {boolean} grow
   * @returns {boolean}
   */
  Snake.prototype.willCollide = function (point, grow) {
    var body = this._cells;
    var limit = grow ? body.length : body.length - 1;
    var i;
    for (i = 0; i < limit; i++) {
      if (body[i].x === point.x && body[i].y === point.y) {
        return true;
      }
    }
    return false;
  };

  /**
   * Apply the queued direction and advance one cell. Drops the tail unless
   * growing.
   * @param {boolean} grow
   * @returns {{x:number,y:number}|null} the vacated tail cell, or null if grown.
   */
  Snake.prototype.move = function (grow) {
    this._direction = this._nextDirection;
    var head = this._cells[0];
    this._cells.unshift({
      x: head.x + this._direction.x,
      y: head.y + this._direction.y
    });
    if (grow) {
      return null;
    }
    return this._cells.pop();
  };

  return Snake;
})();
