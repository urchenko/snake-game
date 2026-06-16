/**
 * Food — a single piece of food on the board. Pure data, no DOM.
 *
 * Respawns into a random free cell (never inside the snake). Returns null when
 * there is no free cell left (board full -> win condition, decided by the game).
 */
var App = App || {};

App.Food = (function () {
  'use strict';

  function Food() {
    this._position = null;
  }

  /** @returns {{x:number,y:number}|null} current position. */
  Food.prototype.position = function () {
    return this._position;
  };

  /**
   * Move the food to a random free cell.
   * @param {App.Board} board
   * @param {App.Snake} snake
   * @returns {{x:number,y:number}|null} new position, or null if the board is full.
   */
  Food.prototype.respawn = function (board, snake) {
    this._position = board.randomFreeCell(snake.cells());
    return this._position;
  };

  return Food;
})();
