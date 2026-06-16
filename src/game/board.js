/**
 * Board — the grid model. Pure data, no DOM.
 *
 * Knows the grid dimensions and answers spatial queries: whether a point is
 * inside the walls, and where a random *free* cell is (for spawning food).
 * It does not own the snake; callers pass the occupied cells in.
 */
var App = App || {};

App.Board = (function () {
  'use strict';

  /**
   * @param {number} cols
   * @param {number} rows
   */
  function Board(cols, rows) {
    this.cols = cols;
    this.rows = rows;
  }

  /** @returns {boolean} true if (x,y) is within the walls. */
  Board.prototype.isInside = function (x, y) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  };

  /** @returns {number} total number of cells. */
  Board.prototype.cellCount = function () {
    return this.cols * this.rows;
  };

  /**
   * Pick a uniformly random cell not in `occupiedCells`.
   * @param {Array.<{x:number,y:number}>} occupiedCells
   * @returns {{x:number,y:number}|null} null when the board is full.
   */
  Board.prototype.randomFreeCell = function (occupiedCells) {
    var occupied = {};
    occupiedCells.forEach(function (c) {
      occupied[c.x + ',' + c.y] = true;
    });

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
    return free[Math.floor(Math.random() * free.length)];
  };

  return Board;
})();
