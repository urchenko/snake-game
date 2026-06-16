/**
 * AdService — abstraction for "play one ad, then tell me you're done".
 *
 * The game flow depends only on this contract; it does NOT know about Google
 * IMA. WHEN to show an ad lives in the states; HOW to show one lives here.
 * Contract: playAd(onFinished) MUST invoke onFinished exactly once, regardless
 * of success/skip/empty/error — so the flow can never get stuck.
 *
 * NoopAdService is the Day-3 stand-in: it "plays" nothing and finishes on the
 * next tick (async, to mimic a real ad and avoid re-entrant transitions).
 * Day 4 adds ImaAdService (real Google IMA) as a drop-in replacement.
 */
var App = App || {};

App.AdService = (function () {
  'use strict';

  function AdService() {}

  /**
   * @param {function()} onFinished called once when the ad is done/failed.
   */
  AdService.prototype.playAd = function (/* onFinished */) {
    throw new Error('AdService.playAd() must be implemented by a subclass');
  };

  return AdService;
})();

App.NoopAdService = (function () {
  'use strict';

  function NoopAdService() {
    App.AdService.call(this);
  }
  NoopAdService.prototype = Object.create(App.AdService.prototype);
  NoopAdService.prototype.constructor = NoopAdService;

  NoopAdService.prototype.playAd = function (onFinished) {
    window.setTimeout(function () {
      if (onFinished) {
        onFinished();
      }
    }, 0);
  };

  return NoopAdService;
})();
