/**
 * Dialog — a custom Yes/No (or N-option) modal. Own DOM + CSS only.
 *
 * No native <button>/<dialog>/confirm(). Driven entirely by the 6 semantic
 * commands: UP/LEFT = previous option, DOWN/RIGHT = next, CONFIRM = select the
 * highlighted option, CANCEL = select the configured cancel value (e.g. "No").
 *
 * Generic: the caller supplies the title, options and an onSelect callback, so
 * the same component serves the start and game-over prompts.
 */
var App = App || {};

App.Dialog = (function () {
  'use strict';

  var Config = App.Config;

  /**
   * @param {HTMLElement} mountEl the UI layer to render into
   */
  function Dialog(mountEl) {
    this._mount = mountEl;
    this._root = null;
    this._optionEls = [];
    this._options = [];
    this._index = 0;
    this._cancelValue = null;
    this._onSelect = null;
  }

  Dialog.prototype.isOpen = function () {
    return this._root !== null;
  };

  /**
   * Open the dialog.
   * @param {Object} opts
   *   title {string}
   *   message {string=}
   *   options {Array.<{label:string,value:*}>}
   *   selectedIndex {number=} default 0
   *   cancelValue {*=} value chosen on CANCEL (Backspace); null = ignore CANCEL
   *   onSelect {function(*)} called once with the chosen value
   */
  Dialog.prototype.open = function (opts) {
    this.close(); // never stack dialogs

    this._options = opts.options;
    this._index = opts.selectedIndex || 0;
    this._cancelValue = (opts.cancelValue !== undefined) ? opts.cancelValue : null;
    this._onSelect = opts.onSelect;

    var root = document.createElement('div');
    root.className = 'dialog';

    var panel = document.createElement('div');
    panel.className = 'dialog__panel';

    var title = document.createElement('div');
    title.className = 'dialog__title';
    title.textContent = opts.title;
    panel.appendChild(title);

    if (opts.message) {
      var msg = document.createElement('div');
      msg.className = 'dialog__message';
      msg.textContent = opts.message;
      panel.appendChild(msg);
    }

    var list = document.createElement('div');
    list.className = 'dialog__options';
    this._optionEls = [];
    var self = this;
    this._options.forEach(function (opt, i) {
      var el = document.createElement('div');
      el.className = 'dialog__option';
      el.textContent = opt.label;
      // Conventional mouse/touch menu UX: hover highlights, click selects.
      // Keyboard still works via handleCommand(); both share the same _index.
      el.addEventListener('mouseenter', function () {
        self._index = i;
        self._highlight();
      });
      el.addEventListener('click', function () {
        self._index = i;
        self._select(opt.value);
      });
      list.appendChild(el);
      self._optionEls.push(el);
    });
    panel.appendChild(list);

    var hint = document.createElement('div');
    hint.className = 'dialog__hint';
    hint.textContent = 'Arrows / hover: choose   Enter / click: confirm   Backspace: No';
    panel.appendChild(hint);

    root.appendChild(panel);
    this._mount.appendChild(root);
    this._root = root;

    this._highlight();
  };

  /** Route a semantic command into the dialog. No-op when closed. */
  Dialog.prototype.handleCommand = function (command) {
    if (!this._root) {
      return;
    }
    switch (command) {
      case Config.CMD_UP:
      case Config.CMD_LEFT:
        this._move(-1);
        break;
      case Config.CMD_DOWN:
      case Config.CMD_RIGHT:
        this._move(1);
        break;
      case Config.CMD_CONFIRM:
        this._select(this._options[this._index].value);
        break;
      case Config.CMD_CANCEL:
        if (this._cancelValue !== null) {
          this._select(this._cancelValue);
        }
        break;
    }
  };

  Dialog.prototype.close = function () {
    if (this._root) {
      this._mount.removeChild(this._root);
    }
    this._root = null;
    this._optionEls = [];
    this._options = [];
    this._onSelect = null;
  };

  Dialog.prototype._move = function (delta) {
    var n = this._options.length;
    this._index = (this._index + delta + n) % n; // wrap
    this._highlight();
  };

  Dialog.prototype._highlight = function () {
    var active = this._index;
    this._optionEls.forEach(function (el, i) {
      el.className = (i === active) ? 'dialog__option dialog__option--active' : 'dialog__option';
    });
  };

  Dialog.prototype._select = function (value) {
    var cb = this._onSelect;
    this.close();          // remove DOM before any state transition fires
    if (cb) {
      cb(value);
    }
  };

  return Dialog;
})();
