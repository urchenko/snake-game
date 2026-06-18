/**
 * DomRenderer — Web DOM implementation of the Renderer interface.
 *
 * Performance strategy:
 *  - Object Pool: every grid cell is a <div> created ONCE in init(); we never
 *    create/destroy nodes during gameplay.
 *  - Delta updates: only changed cells are touched (new head, eaten food,
 *    removed tail) — the playing state updates the delta, not the whole board.
 *  - No layout thrashing: cells are absolutely positioned once; per-tick we only
 *    swap a className (-> background paint), never read/write geometry.
 *
 * Inherits from App.Renderer.
 */
var App = App || {};

App.DomRenderer = (function () {
  'use strict';

  var Config = App.Config;

  /**
   * @param {HTMLElement} mountEl the #playfield element
   */
  function DomRenderer(mountEl) {
    App.Renderer.call(this);
    this._mount = mountEl;
    this._cells = null;  // pool: array indexed by (y * COLS + x)
    this._types = null;  // current type per cell, to skip no-op writes
  }

  // Prototype chain: DomRenderer extends Renderer.
  DomRenderer.prototype = Object.create(App.Renderer.prototype);
  DomRenderer.prototype.constructor = DomRenderer;

  DomRenderer.prototype._index = function (x, y) {
    return y * Config.COLS + x;
  };

  /** Build the cell pool once and attach it to the mount node. */
  DomRenderer.prototype.init = function () {
    var cols = Config.COLS;
    var rows = Config.ROWS;
    var cell = Config.CELL;
    var total = cols * rows;

    this._cells = new Array(total);
    this._types = new Array(total);

    // Build into a fragment to touch the live DOM only once.
    var frag = document.createDocumentFragment();
    var x, y, idx, el, parity;
    for (y = 0; y < rows; y++) {
      for (x = 0; x < cols; x++) {
        idx = this._index(x, y);
        parity = ((x + y) % 2 === 0) ? 'cell--even' : 'cell--odd';
        el = document.createElement('div');
        el.className = 'cell ' + parity;
        el.style.left = (x * cell) + 'px';
        el.style.top = (y * cell) + 'px';
        el.style.width = cell + 'px';
        el.style.height = cell + 'px';
        // Remember parity so type swaps can rebuild className cheaply.
        el._parity = parity;
        this._cells[idx] = el;
        this._types[idx] = Config.CELL_EMPTY;
        frag.appendChild(el);
      }
    }
    this._mount.appendChild(frag);
  };

  /** Reset every cell to empty. */
  DomRenderer.prototype.clear = function () {
    var cols = Config.COLS;
    var rows = Config.ROWS;
    var x, y;
    for (y = 0; y < rows; y++) {
      for (x = 0; x < cols; x++) {
        this.clearCell(x, y);
      }
    }
  };

  /**
   * @param {number} x
   * @param {number} y
   * @param {string} type one of Config.CELL_*
   * @param {string=} variant optional modifier (e.g. head facing); adds
   *   `cell--<type>--<variant>` so CSS can style it.
   */
  DomRenderer.prototype.drawCell = function (x, y, type, variant) {
    var idx = this._index(x, y);
    // Cache the full (type + variant) signature so a variant change repaints.
    var key = type + '|' + (variant || '');
    if (this._types[idx] === key) {
      return; // no-op: avoid touching the DOM
    }
    this._types[idx] = key;
    var el = this._cells[idx];
    var className = 'cell ' + el._parity;
    if (type && type !== Config.CELL_EMPTY) {
      className += ' cell--' + type;
      if (variant) {
        className += ' cell--' + type + '--' + variant;
      }
    }
    el.className = className;
  };

  DomRenderer.prototype.clearCell = function (x, y) {
    this.drawCell(x, y, Config.CELL_EMPTY);
  };

  return DomRenderer;
})();
