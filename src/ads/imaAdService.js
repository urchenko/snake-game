/**
 * ImaAdService — Google IMA HTML5 implementation of the AdService contract.
 *
 * Plays a single linear (preroll) ad as an overlay in the SAME window, then
 * resumes the game. The game flow only knows playAd(onFinished); all IMA
 * details live here (Facade over the SDK).
 *
 * Robustness is the headline requirement: onFinished MUST fire exactly once for
 * every outcome — success, COMPLETE/ALL_ADS_COMPLETED, SKIPPED, AdError, empty
 * VAST, missing SDK (adblock), or a hung load (watchdog). The game can never
 * get stuck on an ad.
 *
 * Each play builds a FRESH AdDisplayContainer + AdsLoader (and clears the ad
 * container) so the second ad spot (game-over "Yes") is not affected by any
 * leftover state from the first. AdDisplayContainer.initialize() is called every
 * play, which is allowed because every play happens inside the "Yes" Enter
 * gesture.
 *
 * IMA may ship non-ES5 code; we don't touch it — our code stays ES5.
 */
var App = App || {};

App.ImaAdService = (function () {
  'use strict';

  /**
   * @param {Object} opts
   *   overlayEl {HTMLElement}     full-window overlay (shown during the ad)
   *   videoEl {HTMLVideoElement}  content element IMA needs for tracking
   *   adContainerEl {HTMLElement} where IMA renders the ad UI
   *   adTagUrl {string}
   *   width {number}, height {number}
   *   loadTimeoutMs {number=}, maxDurationMs {number=}
   */
  function ImaAdService(opts) {
    App.AdService.call(this);
    this._overlayEl = opts.overlayEl;
    this._videoEl = opts.videoEl;
    this._adContainerEl = opts.adContainerEl;
    this._adTagUrl = opts.adTagUrl;
    this._width = opts.width;
    this._height = opts.height;
    this._loadTimeoutMs = opts.loadTimeoutMs || App.Config.AD_LOAD_TIMEOUT_MS;
    this._maxDurationMs = opts.maxDurationMs || App.Config.AD_MAX_DURATION_MS;

    this._adDisplayContainer = null; // fresh per play
    this._adsLoader = null;          // fresh per play
    this._adsManager = null;         // per play; destroyed on finish

    this._onFinished = null;
    this._finished = false;
    this._watchdog = null;  // pre-START load timeout
    this._maxTimer = null;  // overall hard cap (covers post-START hangs)

    var self = this;
    this._handleManagerLoaded = function (e) { self._onAdsManagerLoaded(e); };
    this._handleAdError = function (e) { self._onAdError(e); };
  }

  ImaAdService.prototype = Object.create(App.AdService.prototype);
  ImaAdService.prototype.constructor = ImaAdService;

  ImaAdService.prototype._log = function () {
    if (!App.Config.AD_DEBUG || !(window.console && window.console.log)) {
      return;
    }
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[ads]');
    window.console.log.apply(window.console, args);
  };

  /** @returns {boolean} true if the IMA SDK actually loaded (not blocked). */
  ImaAdService.prototype._sdkAvailable = function () {
    return !!(window.google && window.google.ima);
  };

  /**
   * Play one ad. Called within the "Yes" Enter gesture, so initialize() is
   * allowed to start media.
   * @param {function()} onFinished
   */
  ImaAdService.prototype.playAd = function (onFinished) {
    this._log('playAd: start');
    this._onFinished = onFinished || function () {};
    this._finished = false;

    this._showOverlay();

    // Adblock / SDK failed to load: skip gracefully.
    if (!this._sdkAvailable()) {
      this._log('IMA SDK not available (adblock?) — skipping');
      this._finish('no-sdk');
      return;
    }

    try {
      this._resetDisplayContainer();
      this._createLoader();
      this._requestAds();
      this._startWatchdog();
      this._startMaxTimer();
      this._log('requestAds sent');
    } catch (err) {
      this._log('sync error in playAd:', (err && err.message) || err);
      this._finish('sync-error');
    }
  };

  /**
   * Fresh AdDisplayContainer each play. The container is cleared first so IMA's
   * previous render surface (iframe/divs) doesn't accumulate or interfere.
   */
  ImaAdService.prototype._resetDisplayContainer = function () {
    var ima = window.google.ima;
    while (this._adContainerEl.firstChild) {
      this._adContainerEl.removeChild(this._adContainerEl.firstChild);
    }
    this._adDisplayContainer =
      new ima.AdDisplayContainer(this._adContainerEl, this._videoEl);
    this._adDisplayContainer.initialize(); // allowed: inside the user gesture
  };

  ImaAdService.prototype._createLoader = function () {
    var ima = window.google.ima;
    this._destroyLoader();
    this._adsLoader = new ima.AdsLoader(this._adDisplayContainer);
    this._adsLoader.addEventListener(
      ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, this._handleManagerLoaded, false);
    this._adsLoader.addEventListener(
      ima.AdErrorEvent.Type.AD_ERROR, this._handleAdError, false);
  };

  ImaAdService.prototype._destroyLoader = function () {
    if (this._adsLoader) {
      try { this._adsLoader.destroy(); } catch (e) { /* ignore */ }
      this._adsLoader = null;
    }
  };

  ImaAdService.prototype._requestAds = function () {
    var ima = window.google.ima;
    var request = new ima.AdsRequest();
    request.adTagUrl = this._adTagUrl;
    request.linearAdSlotWidth = this._width;
    request.linearAdSlotHeight = this._height;
    request.nonLinearAdSlotWidth = this._width;
    request.nonLinearAdSlotHeight = Math.floor(this._height / 3);

    // We are inside the "Yes" gesture and the container is initialized, so tell
    // the SDK the ad will autoplay with sound — it then serves/starts a creative
    // that plays instead of waiting for a click.
    if (request.setAdWillAutoPlay) {
      request.setAdWillAutoPlay(true);
    }
    if (request.setAdWillPlayMuted) {
      request.setAdWillPlayMuted(false);
    }

    this._adsLoader.requestAds(request);
  };

  ImaAdService.prototype._onAdsManagerLoaded = function (event) {
    this._log('ADS_MANAGER_LOADED');
    var ima = window.google.ima;

    this._destroyManager(); // defensive: drop any stale manager

    var settings = new ima.AdsRenderingSettings();
    settings.restoreCustomPlaybackStateOnAdBreakComplete = true;

    var manager = event.getAdsManager(this._videoEl, settings);
    this._adsManager = manager;

    var self = this;
    manager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, this._handleAdError, false);
    manager.addEventListener(ima.AdEvent.Type.STARTED, function () {
      self._log('STARTED');
      self._clearWatchdog();
    }, false);
    // Single preroll: either of these signals "ads done, resume content".
    manager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, function () {
      self._finish('content-resume');
    }, false);
    manager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, function () {
      self._finish('all-ads-completed');
    }, false);

    try {
      manager.init(this._width, this._height, ima.ViewMode.NORMAL);
      manager.start();
    } catch (err) {
      this._log('manager start error:', (err && err.message) || err);
      this._finish('manager-error');
    }
  };

  /** Loader OR manager error (network, empty VAST, playback) -> resume gracefully. */
  ImaAdService.prototype._onAdError = function (event) {
    var msg = '';
    try {
      if (event && event.getError) {
        var e = event.getError();
        msg = (e && e.getMessage) ? e.getMessage() : String(e);
      }
    } catch (ignore) { /* ignore */ }
    this._log('AD_ERROR:', msg);
    this._finish('ad-error');
  };

  ImaAdService.prototype._startWatchdog = function () {
    var self = this;
    this._clearWatchdog();
    this._watchdog = window.setTimeout(function () {
      self._log('watchdog: ad never started');
      self._finish('watchdog');
    }, this._loadTimeoutMs);
  };

  ImaAdService.prototype._clearWatchdog = function () {
    if (this._watchdog !== null) {
      window.clearTimeout(this._watchdog);
      this._watchdog = null;
    }
  };

  ImaAdService.prototype._startMaxTimer = function () {
    var self = this;
    this._clearMaxTimer();
    this._maxTimer = window.setTimeout(function () {
      self._log('max-duration cap hit');
      self._finish('max-duration');
    }, this._maxDurationMs);
  };

  ImaAdService.prototype._clearMaxTimer = function () {
    if (this._maxTimer !== null) {
      window.clearTimeout(this._maxTimer);
      this._maxTimer = null;
    }
  };

  ImaAdService.prototype._destroyManager = function () {
    if (this._adsManager) {
      try { this._adsManager.destroy(); } catch (e) { /* ignore */ }
      this._adsManager = null;
    }
  };

  /** Idempotent: cleans up IMA, hides the overlay, and notifies the flow once. */
  ImaAdService.prototype._finish = function (source) {
    if (this._finished) {
      this._log('finish ignored (already finished):', source);
      return;
    }
    this._finished = true;
    this._log('finish ->', source);

    this._clearWatchdog();
    this._clearMaxTimer();
    this._destroyManager();
    this._destroyLoader();
    this._hideOverlay();

    var cb = this._onFinished;
    this._onFinished = null;
    if (cb) {
      cb();
    }
  };

  ImaAdService.prototype._showOverlay = function () {
    this._overlayEl.classList.remove('ad-overlay--hidden');
  };

  ImaAdService.prototype._hideOverlay = function () {
    this._overlayEl.classList.add('ad-overlay--hidden');
  };

  return ImaAdService;
})();
