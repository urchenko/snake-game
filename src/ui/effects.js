/**
 * Effects — small "game feel" helpers (flash, shake) on the scene element.
 *
 * Pure presentation: triggered by states reacting to domain events. Each effect
 * is a one-shot CSS animation toggled by a class; to replay it on the next event
 * we remove the class, force a reflow, then re-add it (the standard CSS
 * animation-restart trick). The reflow read is the ONE deliberate layout read
 * here — it's isolated to effects, not the per-tick render path.
 *
 * Flash runs on its OWN overlay layer and animates only `opacity` (the box-shadow
 * glow is painted once, then composited) — so it can't jank the game loop with
 * per-frame repaints, and it can't collide on the `animation` property with the
 * shake (which lives on the scene). Shake animates `transform` on the scene
 * (also compositor-friendly) and only happens at death, when play has stopped.
 */
var App = App || {};

App.Effects = (function () {
  'use strict';

  function restart(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // force reflow so the animation can play again
    el.classList.add(cls);
  }

  /**
   * @param {HTMLElement} sceneEl the #scene element
   */
  function Effects(sceneEl) {
    this._scene = sceneEl;

    // Dedicated, compositor-friendly flash overlay (opacity only).
    var layer = document.createElement('div');
    layer.className = 'fx-flash-layer';
    sceneEl.appendChild(layer);
    this._flashLayer = layer;
  }

  /** Brief edge-glow flash — used when food is eaten / on a win. */
  Effects.prototype.flash = function () {
    restart(this._flashLayer, 'is-flash');
  };

  /** Quick screen shake — used on death. */
  Effects.prototype.shake = function () {
    restart(this._scene, 'fx-shake');
  };

  return Effects;
})();
