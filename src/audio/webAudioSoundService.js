/**
 * WebAudioSoundService — synthesizes short sounds with the Web Audio API.
 *
 * No audio files: each sound is a tiny oscillator + gain envelope, so there are
 * no asset dependencies and it stays pure ES5 (Web Audio is a browser API).
 *
 * Autoplay policy: an AudioContext starts suspended and may only be resumed from
 * a user gesture. We attach one-time keydown/pointerdown listeners that create
 * and resume the context on the first interaction, then remove themselves — so
 * by the time the first in-game sound plays the context is already running.
 *
 * Mute state is persisted in localStorage (try/catch — never throws).
 */
var App = App || {};

App.WebAudioSoundService = (function () {
  'use strict';

  function readMuted(key) {
    try {
      return window.localStorage.getItem(key) === '1';
    } catch (e) {
      return false;
    }
  }

  function writeMuted(key, muted) {
    try {
      window.localStorage.setItem(key, muted ? '1' : '0');
    } catch (e) {
      /* ignore: storage unavailable */
    }
  }

  /**
   * @param {{ storageKey:string, masterVolume:number= }} opts
   */
  function WebAudioSoundService(opts) {
    App.SoundService.call(this);
    opts = opts || {};
    this._storageKey = opts.storageKey;
    this._masterVolume = (opts.masterVolume === undefined) ? 0.6 : opts.masterVolume;
    this._muted = readMuted(this._storageKey);

    this._ctx = null;
    this._master = null;

    var self = this;
    this._unlock = function () { self._doUnlock(); };
    window.addEventListener('keydown', this._unlock, false);
    window.addEventListener('pointerdown', this._unlock, false);
  }

  WebAudioSoundService.prototype = Object.create(App.SoundService.prototype);
  WebAudioSoundService.prototype.constructor = WebAudioSoundService;

  WebAudioSoundService.prototype._doUnlock = function () {
    window.removeEventListener('keydown', this._unlock, false);
    window.removeEventListener('pointerdown', this._unlock, false);
    if (this._ensureContext() && this._ctx.resume) {
      this._ctx.resume();
    }
  };

  /** @returns {boolean} true if an AudioContext is available/created. */
  WebAudioSoundService.prototype._ensureContext = function () {
    if (this._ctx) {
      return true;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      return false;
    }
    this._ctx = new AC();
    this._master = this._ctx.createGain();
    this._master.gain.value = this._masterVolume;
    this._master.connect(this._ctx.destination);
    return true;
  };

  /**
   * One oscillator note with a click-free envelope.
   * @param {number} freq Hz
   * @param {number} offsetSec start offset from now
   * @param {number} durMs
   * @param {string} type oscillator type
   * @param {number} peak peak gain
   */
  WebAudioSoundService.prototype._tone = function (freq, offsetSec, durMs, type, peak) {
    var ctx = this._ctx;
    var t0 = ctx.currentTime + offsetSec;
    var dur = durMs / 1000;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this._master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  };

  WebAudioSoundService.prototype._death = function () {
    var ctx = this._ctx;
    var t0 = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t0);
    osc.frequency.exponentialRampToValueAtTime(70, t0 + 0.35);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.28, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
    osc.connect(gain);
    gain.connect(this._master);
    osc.start(t0);
    osc.stop(t0 + 0.42);
  };

  /**
   * @param {string} name 'eat' | 'death' | 'win'
   */
  WebAudioSoundService.prototype.play = function (name) {
    if (this._muted || !this._ensureContext()) {
      return;
    }
    switch (name) {
      case 'eat':
        this._tone(740, 0, 70, 'square', 0.16);
        break;
      case 'death':
        this._death();
        break;
      case 'win':
        // little ascending arpeggio C5–E5–G5
        this._tone(523.25, 0.00, 110, 'square', 0.18);
        this._tone(659.25, 0.11, 110, 'square', 0.18);
        this._tone(783.99, 0.22, 170, 'square', 0.20);
        break;
    }
  };

  WebAudioSoundService.prototype.isMuted = function () {
    return this._muted;
  };

  WebAudioSoundService.prototype.setMuted = function (muted) {
    this._muted = !!muted;
    writeMuted(this._storageKey, this._muted);
  };

  WebAudioSoundService.prototype.toggleMuted = function () {
    this.setMuted(!this._muted);
    return this._muted;
  };

  return WebAudioSoundService;
})();
