/**
 * GameOverState — the "Play again?" prompt shown over the frozen board.
 *
 * Reached on death (wall/self) or on a win (board full). Yes -> AD (scenario #2)
 * -> new PLAYING. No -> redirect. The board is intentionally NOT cleared, so the
 * final frame stays visible behind the dialog.
 */
var App = App || {};

App.GameOverState = (function () {
  'use strict';

  var Config = App.Config;

  function GameOverState(ctx) {
    this._ctx = ctx;
    var self = this;
    this._onSelect = function (value) { self._handleSelect(value); };
  }

  GameOverState.prototype.enter = function (params) {
    params = params || {};
    var title = params.won
      ? 'You win! Score ' + params.score
      : 'Game over · Score ' + params.score;

    this._ctx.dialog.open({
      title: title,
      message: 'Play again?',
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' }
      ],
      selectedIndex: 0,
      cancelValue: 'no',
      onSelect: this._onSelect
    });
  };

  GameOverState.prototype.handleCommand = function (command) {
    this._ctx.dialog.handleCommand(command);
  };

  GameOverState.prototype.exit = function () {
    this._ctx.dialog.close();
  };

  GameOverState.prototype._handleSelect = function (value) {
    if (value === 'yes') {
      this._ctx.machine.change(Config.STATE_AD, { next: Config.STATE_PLAYING });
    } else {
      this._ctx.redirect();
    }
  };

  return GameOverState;
})();
