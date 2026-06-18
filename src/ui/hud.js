/**
 * Hud — the on-screen score / status bar. Own DOM, no native controls.
 *
 * Owns the #hud element and exposes small setters; states call these on domain
 * events instead of the HUD polling game state.
 */
var App = App || {};

App.Hud = (function () {
  'use strict';

  /**
   * @param {HTMLElement} el the #hud element
   */
  function Hud(el) {
    this._el = el;
    this._el.innerHTML = '';

    this._brand = document.createElement('span');
    this._brand.className = 'hud__brand';
    this._brand.textContent = 'SNAKE';

    this._status = document.createElement('span');
    this._status.className = 'hud__status';

    // Right side holds Best + Score together.
    this._right = document.createElement('span');
    this._right.className = 'hud__right';

    this._best = document.createElement('span');
    this._best.className = 'hud__best';

    this._score = document.createElement('span');
    this._score.className = 'hud__score';

    this._right.appendChild(this._best);
    this._right.appendChild(this._score);

    this._el.appendChild(this._brand);
    this._el.appendChild(this._status);
    this._el.appendChild(this._right);

    this.setBest(0);
    this.setScore(0);
    this.setStatus('');
  }

  /** @param {number} score */
  Hud.prototype.setScore = function (score) {
    this._score.textContent = 'Score: ' + score;
  };

  /** @param {number} best persistent high score */
  Hud.prototype.setBest = function (best) {
    this._best.textContent = 'Best: ' + best;
  };

  /** Briefly pop the score number (game feel on eat). */
  Hud.prototype.pulseScore = function () {
    var el = this._score;
    el.classList.remove('is-pulse');
    void el.offsetWidth; // restart the animation
    el.classList.add('is-pulse');
  };

  /** @param {string} text centered status text (e.g. "Paused"); '' to clear. */
  Hud.prototype.setStatus = function (text) {
    this._status.textContent = text;
  };

  return Hud;
})();
