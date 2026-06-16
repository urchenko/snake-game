/**
 * InputController — keyboard -> semantic commands.
 *
 * The rest of the app never sees raw key codes; it subscribes to the emitter
 * and reacts to semantic commands (UP/DOWN/LEFT/RIGHT/CONFIRM/CANCEL). A second
 * source (mouse) can later emit the SAME commands without changing consumers.
 *
 * Strictly 6 keys, per the brief:
 *   ArrowUp/Down/Left/Right, Enter (confirm/yes), Backspace (cancel/no).
 *
 * preventDefault on these keys stops page scroll (arrows/space) and browser
 * "back" navigation (Backspace).
 */
var App = App || {};

App.InputController = (function () {
  'use strict';

  var Config = App.Config;

  // event.key -> semantic command. Using .key keeps it readable and layout-safe.
  var KEY_MAP = {
    'ArrowUp': Config.CMD_UP,
    'ArrowDown': Config.CMD_DOWN,
    'ArrowLeft': Config.CMD_LEFT,
    'ArrowRight': Config.CMD_RIGHT,
    'Enter': Config.CMD_CONFIRM,
    'Backspace': Config.CMD_CANCEL
  };

  /**
   * @param {App.EventEmitter} emitter where 'command' events are published
   */
  function InputController(emitter) {
    this._emitter = emitter;
    this._attached = false;
    var self = this;
    this._onKeyDown = function (e) { self._handleKeyDown(e); };
  }

  InputController.prototype._handleKeyDown = function (e) {
    var command = KEY_MAP[e.key];
    if (!command) {
      return; // ignore everything outside our 6 keys
    }
    // Stop scrolling / browser back navigation for our keys.
    e.preventDefault();
    this._emitter.emit('command', command);
  };

  /** Start listening (idempotent). */
  InputController.prototype.attach = function () {
    if (this._attached) {
      return;
    }
    this._attached = true;
    // Non-passive so preventDefault works for scroll keys.
    window.addEventListener('keydown', this._onKeyDown, false);
  };

  /** Stop listening and release the handler (no leaks). */
  InputController.prototype.detach = function () {
    if (!this._attached) {
      return;
    }
    this._attached = false;
    window.removeEventListener('keydown', this._onKeyDown, false);
  };

  return InputController;
})();
