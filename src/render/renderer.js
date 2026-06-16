/**
 * Renderer — abstract rendering interface ("contract").
 *
 * The game's domain logic talks ONLY to this interface and never touches the
 * DOM directly. Swapping DomRenderer for a Canvas/WebGL renderer must not
 * require any change to game logic (Dependency Inversion / Open-Closed).
 *
 * This base "throws if not implemented" to document the contract; concrete
 * renderers inherit and override every method.
 *
 * Coordinate space: integer grid cells, x in [0, COLS), y in [0, ROWS).
 */
var App = App || {};

App.Renderer = (function () {
  'use strict';

  function Renderer() {}

  function notImplemented(name) {
    return function () {
      throw new Error('Renderer.' + name + '() must be implemented by a subclass');
    };
  }

  /** Build the grid / allocate any backing resources. Called once. */
  Renderer.prototype.init = notImplemented('init');

  /** Reset every cell to empty. */
  Renderer.prototype.clear = notImplemented('clear');

  /**
   * Paint a single cell with a semantic type (Config.CELL_*).
   * @param {number} x
   * @param {number} y
   * @param {string} type
   */
  Renderer.prototype.drawCell = notImplemented('drawCell');

  /**
   * Reset a single cell to empty (delta updates: e.g. removed tail).
   * @param {number} x
   * @param {number} y
   */
  Renderer.prototype.clearCell = notImplemented('clearCell');

  return Renderer;
})();
