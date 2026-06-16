/**
 * StartState — the opening "Play Snake?" prompt.
 *
 * Yes -> AD (scenario #1) -> PLAYING. No -> redirect to the external resource.
 * Renders a custom Yes/No dialog over an empty board; input is forwarded to it.
 */
var App = App || {};

App.StartState = (function () {
  'use strict';

  var Config = App.Config;

  /**
   * @param {Object} ctx shared services (machine, renderer, dialog, redirect, ...)
   */
  function StartState(ctx) {
    this._ctx = ctx;
    var self = this;
    this._onSelect = function (value) { self._handleSelect(value); };
  }

  StartState.prototype.enter = function () {
    var ctx = this._ctx;
    ctx.renderer.clear();
    ctx.hud.setScore(0);
    ctx.dialog.open({
      title: 'Play Snake?',
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' }
      ],
      selectedIndex: 0,
      cancelValue: 'no',
      onSelect: this._onSelect
    });
  };

  StartState.prototype.handleCommand = function (command) {
    this._ctx.dialog.handleCommand(command);
  };

  StartState.prototype.exit = function () {
    this._ctx.dialog.close();
  };

  StartState.prototype._handleSelect = function (value) {
    if (value === 'yes') {
      this._ctx.machine.change(Config.STATE_AD, { next: Config.STATE_PLAYING });
    } else {
      this._ctx.redirect();
    }
  };

  return StartState;
})();
