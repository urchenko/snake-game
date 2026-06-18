/**
 * SoundService — abstraction for short game sounds, with a mute toggle.
 *
 * The game flow only knows play(name) + mute accessors; it does not know about
 * Web Audio (mirrors the Renderer / AdService pattern). WebAudioSoundService is
 * the real implementation; NoopSoundService is the silent stand-in used when no
 * AudioContext exists.
 *
 * Names used by the game: 'eat', 'death', 'win'.
 */
var App = App || {};

App.SoundService = (function () {
  'use strict';

  function SoundService() {}

  /** @param {string} name one of 'eat' | 'death' | 'win' */
  SoundService.prototype.play = function (/* name */) {};
  /** @returns {boolean} */
  SoundService.prototype.isMuted = function () { return false; };
  /** @param {boolean} muted */
  SoundService.prototype.setMuted = function (/* muted */) {};
  /** @returns {boolean} the new muted state */
  SoundService.prototype.toggleMuted = function () { return false; };

  return SoundService;
})();

App.NoopSoundService = (function () {
  'use strict';

  function NoopSoundService() {
    App.SoundService.call(this);
  }
  NoopSoundService.prototype = Object.create(App.SoundService.prototype);
  NoopSoundService.prototype.constructor = NoopSoundService;

  return NoopSoundService;
})();
