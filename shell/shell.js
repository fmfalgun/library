/**
 * shell.js
 * Loads one library page into the shell's iframe. The page comes from the
 * `?page=<name>` query parameter (name = file name without .html) and is
 * only loaded if library.json lists it, so the frame can never be pointed at
 * an arbitrary URL. Pages are loaded as they are; the shell only forces the
 * dark theme so they match the portfolio.
 */

const INDEX_URL = 'library.json';
const PAGES_DIR = 'pages/';
const LIST_URL  = '/library.html';

const frame   = document.getElementById('shell-frame');
const message = document.getElementById('shell-message');

/**
 * Return the requested page name from the URL, or null when absent.
 */
function requestedName() {
  return new URLSearchParams(location.search).get('page');
}

/**
 * Fetch library.json and return its `pages` array, or null on any failure.
 */
async function fetchPages() {
  try {
    const res = await fetch(INDEX_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const index = await res.json();
    return Array.isArray(index.pages) ? index.pages : null;
  } catch (err) {
    console.warn(`[library-shell] Failed to fetch ${INDEX_URL}:`, err.message);
    return null;
  }
}

/**
 * Show a message in place of the frame.
 */
function showMessage(text) {
  frame.hidden = true;
  message.hidden = false;
  message.textContent = text;
}

/**
 * Force the dark theme inside the loaded page (the portfolio is dark-only).
 * Library pages read data-theme on <html>; the page itself is not edited.
 * The frame is same-origin, so its document is reachable.
 */
function applyDarkTheme() {
  const doc = frame.contentDocument;
  if (doc) doc.documentElement.dataset.theme = 'dark';
}

/**
 * Point the frame at the page and update the tab title.
 */
function openPage(entry) {
  document.title = `${entry.title} | Library | FM//SEC — Falgun Marothia`;
  frame.addEventListener('load', applyDarkTheme);
  frame.src = `${PAGES_DIR}${entry.file}`;
}

/**
 * Resolve the requested page and open it. With no page requested the visitor
 * is sent to the portfolio's Library list.
 */
async function init() {
  const name = requestedName();
  if (!name) { location.replace(LIST_URL); return; }

  const pages = await fetchPages();
  if (!pages) { showMessage('The library index could not be loaded. Try again later.'); return; }

  const entry = pages.find(page => page.file === `${name}.html`);
  if (!entry) { showMessage(`No library page named "${name}".`); return; }
  openPage(entry);
}

init();
