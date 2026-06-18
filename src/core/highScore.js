/**
 * HighScore — persistent best score backed by localStorage.
 *
 * Infrastructure, not domain: the SnakeGame rules know nothing about storage.
 * Every localStorage access is wrapped in try/catch because it can throw or be
 * unavailable (private mode, disabled storage); on failure we degrade to an
 * in-memory best for the session so the game never breaks.
 */
var App = App || {};

App.HighScore = (function () {
  'use strict';

  /**
   * @param {string} key localStorage key
   */
  function HighScore(key) {
    this._key = key;
    this._best = this._read();
  }

  HighScore.prototype._read = function () {
    try {
      var raw = window.localStorage.getItem(this._key);
      var n = parseInt(raw, 10);
      return (isFinite(n) && n > 0) ? n : 0;
    } catch (e) {
      return 0;
    }
  };

  HighScore.prototype._write = function (n) {
    try {
      window.localStorage.setItem(this._key, String(n));
    } catch (e) {
      /* ignore: storage unavailable -> keep the in-memory best only */
    }
  };

  /** @returns {number} current best. */
  HighScore.prototype.get = function () {
    return this._best;
  };

  /**
   * Record a finished game's score; persists it if it beats the best.
   * @param {number} score
   * @returns {number} the (possibly updated) best.
   */
  HighScore.prototype.submit = function (score) {
    if (score > this._best) {
      this._best = score;
      this._write(score);
    }
    return this._best;
  };

  return HighScore;
})();
