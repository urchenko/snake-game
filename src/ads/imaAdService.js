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
   *   loadTimeoutMs {number=}
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

    this._adDisplayContainer = null; // created/initialized once (needs a user gesture)
    this._adsLoader = null;          // reused across plays
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

  /** @returns {boolean} true if the IMA SDK actually loaded (not blocked). */
  ImaAdService.prototype._sdkAvailable = function () {
    return !!(window.google && window.google.ima);
  };

  /**
   * Play one ad. Must be called within a user-gesture call stack (it is — the
   * "Yes" choice comes from an Enter keydown) so AdDisplayContainer.initialize()
   * is allowed to start media.
   * @param {function()} onFinished
   */
  ImaAdService.prototype.playAd = function (onFinished) {
    this._onFinished = onFinished || function () {};
    this._finished = false;

    this._showOverlay();

    // Adblock / SDK failed to load: skip gracefully.
    if (!this._sdkAvailable()) {
      this._finish();
      return;
    }

    try {
      this._ensureDisplayContainer();
      this._ensureLoader();
      this._requestAds();
      this._startWatchdog();
      this._startMaxTimer();
    } catch (err) {
      // Any synchronous IMA failure -> resume the game.
      this._finish();
    }
  };

  ImaAdService.prototype._ensureDisplayContainer = function () {
    if (this._adDisplayContainer) {
      return;
    }
    var ima = window.google.ima;
    this._adDisplayContainer = new ima.AdDisplayContainer(this._adContainerEl, this._videoEl);
    // Must happen as a result of a user action; the first play is inside the gesture.
    this._adDisplayContainer.initialize();
  };

  ImaAdService.prototype._ensureLoader = function () {
    if (this._adsLoader) {
      return;
    }
    var ima = window.google.ima;
    this._adsLoader = new ima.AdsLoader(this._adDisplayContainer);
    this._adsLoader.addEventListener(
      ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, this._handleManagerLoaded, false);
    this._adsLoader.addEventListener(
      ima.AdErrorEvent.Type.AD_ERROR, this._handleAdError, false);
  };

  ImaAdService.prototype._requestAds = function () {
    var ima = window.google.ima;
    var request = new ima.AdsRequest();
    request.adTagUrl = this._adTagUrl;
    request.linearAdSlotWidth = this._width;
    request.linearAdSlotHeight = this._height;
    request.nonLinearAdSlotWidth = this._width;
    request.nonLinearAdSlotHeight = Math.floor(this._height / 3);

    // Tell the SDK the ad will autoplay with sound (we are inside the "Yes"
    // gesture and AdDisplayContainer is initialized), so it serves and starts a
    // creative that can actually play instead of waiting for a click.
    if (request.setAdWillAutoPlay) {
      request.setAdWillAutoPlay(true);
    }
    if (request.setAdWillPlayMuted) {
      request.setAdWillPlayMuted(false);
    }

    this._adsLoader.requestAds(request);
  };

  ImaAdService.prototype._onAdsManagerLoaded = function (event) {
    var ima = window.google.ima;

    // Defensive: a stale manager from a previous play.
    this._destroyManager();

    var settings = new ima.AdsRenderingSettings();
    settings.restoreCustomPlaybackStateOnAdBreakComplete = true;

    var manager = event.getAdsManager(this._videoEl, settings);
    this._adsManager = manager;

    var self = this;
    manager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, this._handleAdError, false);
    manager.addEventListener(ima.AdEvent.Type.STARTED, function () { self._clearWatchdog(); }, false);
    // Single preroll: either of these signals "ads done, resume content".
    manager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, function () { self._finish(); }, false);
    manager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, function () { self._finish(); }, false);

    try {
      manager.init(this._width, this._height, ima.ViewMode.NORMAL);
      manager.start();
    } catch (err) {
      this._finish();
    }
  };

  /** Loader OR manager error (network, empty VAST, playback) -> resume gracefully. */
  ImaAdService.prototype._onAdError = function (/* event */) {
    this._finish();
  };

  ImaAdService.prototype._startWatchdog = function () {
    var self = this;
    this._clearWatchdog();
    this._watchdog = window.setTimeout(function () {
      self._finish();
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
      self._finish();
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
  ImaAdService.prototype._finish = function () {
    if (this._finished) {
      return;
    }
    this._finished = true;

    this._clearWatchdog();
    this._clearMaxTimer();
    this._destroyManager();
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
