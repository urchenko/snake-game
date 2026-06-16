/**
 * StateMachine — explicit finite state machine (State pattern).
 *
 * Drives the game flow: START -> AD -> PLAYING -> GAME OVER -> ...
 * Each state is an object implementing (all optional):
 *   enter(params)        called when the state becomes current
 *   exit()               called when leaving the state (clean up listeners!)
 *   handleCommand(cmd)   semantic input command (UP/DOWN/.../CONFIRM/CANCEL)
 *   update(stepMs)       fixed-timestep simulation tick
 *   render(alpha)        per-frame render hook (optional)
 *
 * The machine owns the "current state" and forwards loop/input to it.
 */
var App = App || {};

App.StateMachine = (function () {
  'use strict';

  function StateMachine() {
    this._states = {};
    this._current = null;
    this._currentName = null;
  }

  /**
   * Register a state under a name.
   * @param {string} name
   * @param {Object} state
   * @returns {StateMachine} this
   */
  StateMachine.prototype.add = function (name, state) {
    this._states[name] = state;
    return this;
  };

  /**
   * Transition to a registered state: exit current, then enter the new one.
   * @param {string} name
   * @param {*=} params passed to the new state's enter()
   */
  StateMachine.prototype.change = function (name, params) {
    var next = this._states[name];
    if (!next) {
      throw new Error('StateMachine: unknown state "' + name + '"');
    }
    if (this._current && this._current.exit) {
      this._current.exit();
    }
    this._current = next;
    this._currentName = name;
    if (next.enter) {
      next.enter(params);
    }
  };

  StateMachine.prototype.getCurrentName = function () {
    return this._currentName;
  };

  /** Forward a semantic command to the current state. */
  StateMachine.prototype.handleCommand = function (command) {
    if (this._current && this._current.handleCommand) {
      this._current.handleCommand(command);
    }
  };

  /** Forward a fixed-timestep update to the current state. */
  StateMachine.prototype.update = function (stepMs) {
    if (this._current && this._current.update) {
      this._current.update(stepMs);
    }
  };

  /** Forward a per-frame render to the current state. */
  StateMachine.prototype.render = function (alpha) {
    if (this._current && this._current.render) {
      this._current.render(alpha);
    }
  };

  return StateMachine;
})();
