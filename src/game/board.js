/**
 * Board — the grid model. Pure data, no DOM.
 *
 * Knows the grid dimensions and answers spatial queries: whether a point is
 * inside the walls, and where a random *free* cell is (for spawning food).
 * It does not own the snake; callers pass the occupied cells in.
 *
 * Food placement can be weighted by "openness" (how many free orthogonal
 * neighbours a cell has) so food tends to appear in roomier space rather than
 * cramped corners / right against a wall. Pass weightByOpenness=false for the
 * classic uniform pick.
 */
var App = App || {};

App.Board = (function () {
  'use strict';

  /**
   * @param {number} cols
   * @param {number} rows
   * @param {boolean=} weightByOpenness default true
   */
  function Board(cols, rows, weightByOpenness) {
    this.cols = cols;
    this.rows = rows;
    this._weighted = (weightByOpenness !== false);
  }

  /** @returns {boolean} true if (x,y) is within the walls. */
  Board.prototype.isInside = function (x, y) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  };

  /** @returns {number} total number of cells. */
  Board.prototype.cellCount = function () {
    return this.cols * this.rows;
  };

  /** Count free orthogonal neighbours of (x,y) given an occupancy map. */
  Board.prototype._openness = function (x, y, occupied) {
    var n = 0;
    if (this.isInside(x + 1, y) && !occupied[(x + 1) + ',' + y]) { n++; }
    if (this.isInside(x - 1, y) && !occupied[(x - 1) + ',' + y]) { n++; }
    if (this.isInside(x, y + 1) && !occupied[x + ',' + (y + 1)]) { n++; }
    if (this.isInside(x, y - 1) && !occupied[x + ',' + (y - 1)]) { n++; }
    return n;
  };

  /**
   * Pick a random cell not in `occupiedCells`. Uniform if weighting is off,
   * otherwise weighted toward open cells (weight = free neighbours + 1, so even
   * an enclosed cell can still be chosen).
   * @param {Array.<{x:number,y:number}>} occupiedCells
   * @returns {{x:number,y:number}|null} null when the board is full.
   */
  Board.prototype.randomFreeCell = function (occupiedCells) {
    var occupied = {};
    var i;
    for (i = 0; i < occupiedCells.length; i++) {
      occupied[occupiedCells[i].x + ',' + occupiedCells[i].y] = true;
    }

    var free = [];
    var x, y;
    for (y = 0; y < this.rows; y++) {
      for (x = 0; x < this.cols; x++) {
        if (!occupied[x + ',' + y]) {
          free.push({ x: x, y: y });
        }
      }
    }

    if (free.length === 0) {
      return null;
    }
    if (!this._weighted) {
      return free[Math.floor(Math.random() * free.length)];
    }

    var total = 0;
    var weights = new Array(free.length);
    for (i = 0; i < free.length; i++) {
      weights[i] = this._openness(free[i].x, free[i].y, occupied) + 1;
      total += weights[i];
    }

    var r = Math.random() * total;
    for (i = 0; i < free.length; i++) {
      r -= weights[i];
      if (r < 0) {
        return free[i];
      }
    }
    return free[free.length - 1]; // floating-point guard
  };

  return Board;
})();
