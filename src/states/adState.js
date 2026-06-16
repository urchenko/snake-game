/**
 * AdState — intermediate state that plays exactly one ad, then moves on.
 *
 * Delegates entirely to the AdService abstraction (Noop on Day 3, IMA on Day 4):
 * it calls playAd() and transitions to `params.next` when the callback fires.
 * Because the contract guarantees the callback runs exactly once (even on
 * error/skip/empty/adblock), the flow can never get stuck here.
 *
 * Input is ignored while an ad is playing.
 */
var App = App || {};

App.AdState = (function () {
  'use strict';

  function AdState(ctx) {
    this._ctx = ctx;
    this._next = null;
    var self = this;
    this._onFinished = function () { self._finish(); };
  }

  AdState.prototype.enter = function (params) {
    params = params || {};
    this._next = params.next;
    this._done = false;
    this._ctx.adService.playAd(this._onFinished);
  };

  AdState.prototype.handleCommand = function (/* command */) {
    // Intentionally ignored: no game/menu input during an ad.
  };

  AdState.prototype.exit = function () {
    this._next = null;
  };

  AdState.prototype._finish = function () {
    // Guard against any double callback from a misbehaving ad source.
    if (this._done) {
      return;
    }
    this._done = true;
    this._ctx.machine.change(this._next);
  };

  return AdState;
})();
