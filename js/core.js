/*
 * File purpose: the one script every library page loads. It defines the shared
 * helpers (Library.esc, Library.el), wires the sidebar collapse button, and
 * loads the page's own files from the <body data-page="name"> attribute:
 * js/data/<name>.js (only if <body data-has-data>) and js/pages/<name>.js.
 */
(function () {
  'use strict';

  var Library = (window.Library = window.Library || {});
  var jsBase = document.currentScript.src.replace(/core\.js(\?.*)?$/, '');

  /**
   * Library.esc escapes text for safe use inside HTML.
   * @param {string} text raw text
   * @returns {string} text with &, < and > replaced by entities
   */
  Library.esc = function (text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  /**
   * Library.el builds a DOM element, so pages never concatenate HTML for UI chrome.
   * @param {string} tag element name
   * @param {string} [className] class attribute
   * @param {string} [text] text content (set as text, never as HTML)
   * @returns {HTMLElement} the new, unattached element
   */
  Library.el = function (tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /**
   * loadScript appends a script and calls done once it has run, so scripts
   * load in a fixed order (data before page logic).
   * @param {string} path path relative to the js/ folder
   * @param {function} done called after the script loaded or failed
   * Errors: a failed load is logged to the console and still calls done,
   * so one missing file does not hide the rest of the page.
   */
  function loadScript(path, done) {
    var script = document.createElement('script');
    script.src = jsBase + path;
    script.onload = done;
    script.onerror = function () { console.error('library: could not load ' + path); done(); };
    document.head.appendChild(script);
  }

  /**
   * initSidebar makes #collapseBtn show or hide the sidebar (nav.steps).
   * Pages without a sidebar have no such button, so nothing happens for them.
   */
  function initSidebar() {
    var button = document.getElementById('collapseBtn');
    var nav = document.querySelector('nav.steps');
    if (!button || !nav) return;
    button.addEventListener('click', function () { nav.classList.toggle('collapsed'); });
  }

  /**
   * boot runs once the DOM is ready: sidebar first, then the page's data and logic.
   * Side effects: injects up to two script tags into <head>.
   */
  function boot() {
    var name = document.body.dataset.page;
    initSidebar();
    if (!name) return;
    var loadPage = function () { loadScript('pages/' + name + '.js', function () {}); };
    if (document.body.hasAttribute('data-has-data')) loadScript('data/' + name + '.js', loadPage);
    else loadPage();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
