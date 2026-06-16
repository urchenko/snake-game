/**
 * EventEmitter — a tiny Observer implementation.
 *
 * Decouples producers (input, game events, ad events) from consumers
 * (UI, state machine). Producers `emit`; consumers `on`/`off`.
 *
 * Constructor + prototype, no dependencies.
 */
var App = App || {};

App.EventEmitter = (function () {
  'use strict';

  function EventEmitter() {
    this._handlers = {}; // eventName -> array of callbacks
  }

  /**
   * Subscribe `fn` to `event`.
   * @param {string} event
   * @param {Function} fn
   * @returns {EventEmitter} this (chainable)
   */
  EventEmitter.prototype.on = function (event, fn) {
    if (!this._handlers[event]) {
      this._handlers[event] = [];
    }
    this._handlers[event].push(fn);
    return this;
  };

  /**
   * Unsubscribe. With no `fn`, removes all handlers for `event`.
   * @param {string} event
   * @param {Function=} fn
   * @returns {EventEmitter} this
   */
  EventEmitter.prototype.off = function (event, fn) {
    var list = this._handlers[event];
    if (!list) {
      return this;
    }
    if (!fn) {
      delete this._handlers[event];
      return this;
    }
    this._handlers[event] = list.filter(function (h) {
      return h !== fn;
    });
    return this;
  };

  /**
   * Emit `event` with an optional payload, invoking handlers in order.
   * Iterates over a copy so handlers may safely unsubscribe during dispatch.
   * @param {string} event
   * @param {*=} payload
   * @returns {EventEmitter} this
   */
  EventEmitter.prototype.emit = function (event, payload) {
    var list = this._handlers[event];
    if (!list) {
      return this;
    }
    list.slice().forEach(function (fn) {
      fn(payload);
    });
    return this;
  };

  return EventEmitter;
})();
