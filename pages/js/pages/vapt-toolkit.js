/*
 * File purpose: behaviour of vapt-toolkit.html - the phase sidebar, the filter
 * chips, search, and the cards / compare / coverage views. The tool list comes
 * from Library.data (js/data/vapt-toolkit.js); the per-tool details (origin,
 * author, language...) are fetched from the library-tools repo, kept only if a
 * record's show_on lists "vapt", and matched to tools by name. Writing such a
 * record there marks the tool here with no change to this repo.
 */
(function () {
  'use strict';

  var data = Library.data;
  var esc = Library.esc;
  var RECON_DATA = data.RECON_DATA;
  var RECORDS_BASE = 'https://fmfalgun.github.io/library-tools/data/';
  var SITE_ID = 'vapt';
  var STATUS_LABEL = { have: 'In Kali Purple', add: 'Worth adding', other: 'Not in our list' };

  var PHASES = [
    { name: 'Planning & Scoping', enabled: false },
    { name: 'Reconnaissance', enabled: true, steps: data.RECON_STEPS, data: RECON_DATA, type: 'recon' },
    { name: 'Scanning & Enumeration', enabled: true, steps: ['All'].concat(data.SCAN_DATA.map(function (d) { return d.n; })), data: data.SCAN_DATA, type: 'bca' },
    { name: 'Vulnerability Assessment', enabled: true, steps: ['All'].concat(data.VULN_DATA.map(function (d) { return d.n; })), data: data.VULN_DATA, type: 'bca' },
    { name: 'Exploitation', enabled: true, steps: ['All'].concat(data.EXP_DATA.map(function (d) { return d.n; })), data: data.EXP_DATA, type: 'bca' },
    { name: 'Post-Exploitation', enabled: true, steps: ['All'].concat(data.POST_DATA.map(function (d) { return d.n; })), data: data.POST_DATA, type: 'bca' },
    { name: 'Reporting & Remediation', enabled: false }
  ];

  var STATUS_OPTIONS = [['all', 'All tools'], ['have', '✓ In Kali Purple'], ['add', '+ Worth adding'], ['other', '◆ BlackArch / Parrot']];
  var LICENSE_OPTIONS = [['all', 'All licenses'], ['oss', '⬡ Open-source'], ['prop', '⬤ Proprietary']];
  var DETAILS_OPTIONS = [['all', 'All'], ['with', '● With details'], ['without', '○ No details']];
  var VERIFIED_OPTIONS = [['all', 'All'], ['verified', '✓ Verified (discussed)'], ['unverified', '? Unverified (dump)']];

  var stepsNav = document.getElementById('steps');
  var statusRow = document.getElementById('statusRow');
  var licenseRow = document.getElementById('licenseRow');
  var verifiedRow = document.getElementById('verifiedRow');
  var detailsRow = document.getElementById('detailsRow');
  var langRow = document.getElementById('langRow');
  var grid = document.getElementById('grid');
  var tablewrap = document.getElementById('tablewrap');
  var empty = document.getElementById('empty');
  var noteArea = document.getElementById('noteArea');
  var countEl = document.getElementById('count');
  var searchEl = document.getElementById('search');
  var viewToggle = document.getElementById('viewToggle');

  var state = { phase: 'Reconnaissance', cat: 'All', status: 'all', lic: 'all', verified: 'all', details: 'all', lang: 'all', q: '', view: 'cards', expanded: { 'Reconnaissance': true } };

  var languages = [];

  /** currentPhase returns the PHASES entry selected in the sidebar. */
  function currentPhase() { return PHASES.find(function (p) { return p.name === state.phase; }); }

  /**
   * buildPhaseRow adds one phase heading (with expand chevron) to the sidebar.
   * @param {object} phase an entry of PHASES; disabled phases get a "no tool cat." tag
   */
  function buildPhaseRow(phase) {
    var row = Library.el('div', 'phase-row');
    var btn = Library.el('button', 'phase-btn');
    btn.appendChild(Library.el('span', '', phase.name));
    if (!phase.enabled) {
      btn.classList.add('disabled');
      btn.appendChild(Library.el('span', 'soon', 'no tool cat.'));
      row.appendChild(btn);
    } else {
      if (state.phase === phase.name) btn.classList.add('active-phase');
      btn.onclick = function () { state.phase = phase.name; state.cat = 'All'; state.view = 'cards'; render(true); };
      var chev = Library.el('button', 'chev', state.expanded[phase.name] ? '▾' : '▸');
      chev.onclick = function () { state.expanded[phase.name] = !state.expanded[phase.name]; buildSteps(); };
      row.appendChild(btn);
      row.appendChild(chev);
    }
    stepsNav.appendChild(row);
  }

  /**
   * buildStepList adds the collapsible list of steps/categories under an enabled phase.
   * @param {object} phase an enabled entry of PHASES
   */
  function buildStepList(phase) {
    var list = Library.el('div', 'steplist' + (state.expanded[phase.name] ? '' : ' collapsed'));
    phase.steps.forEach(function (cat) {
      var label = cat === 'All' ? 'All' : cat.replace('blackarch-', '');
      var btn = Library.el('button', 'step-btn', label);
      if (state.phase === phase.name && cat === state.cat) btn.classList.add('active');
      btn.onclick = function () { state.phase = phase.name; state.cat = cat; render(true); };
      list.appendChild(btn);
    });
    stepsNav.appendChild(list);
  }

  /** buildSteps redraws the whole phase sidebar from the current state. */
  function buildSteps() {
    stepsNav.innerHTML = '';
    stepsNav.appendChild(Library.el('div', 'navlabel', 'VAPT PHASES'));
    PHASES.forEach(function (phase) {
      buildPhaseRow(phase);
      if (phase.enabled) buildStepList(phase);
    });
  }

  /**
   * buildChipRow draws one row of filter chips; clicking a chip stores its value in state.
   * @param {HTMLElement} container the row element to fill
   * @param {Array} options [value, label] pairs
   * @param {string} key the state field this row controls (status, lic or verified)
   */
  function buildChipRow(container, options, key) {
    container.innerHTML = '';
    options.forEach(function (option) {
      var chip = Library.el('button', 'chip' + (option[0] === state[key] ? ' active' : ''), option[1]);
      chip.dataset.val = option[0];
      chip.onclick = function () { state[key] = option[0]; render(true); };
      container.appendChild(chip);
    });
  }

  /**
   * licFilter tells whether tool d passes the license chip.
   * @param {object} d a tool entry
   * @returns {boolean} true when the chip is "all" or matches d.oss
   */
  function licFilter(d) {
    if (state.lic === 'all') return true;
    return state.lic === 'oss' ? d.oss === true : d.oss === false;
  }

  /**
   * verFilter tells whether entry d passes the verified chip.
   * @param {object} d a tool or category entry
   * @returns {boolean} true when the chip is "all" or matches d.verified
   */
  function verFilter(d) {
    if (state.verified === 'all') return true;
    return state.verified === 'verified' ? d.verified === true : d.verified === false;
  }

  /**
   * searchText returns the lower-case text the search box looks in: the tool
   * name plus, when it has details, their name, author, org and story.
   * @param {object} d a tool or category entry
   */
  function searchText(d) {
    var text = d.n;
    (d.details || []).forEach(function (r) { text += ' ' + [r.name, r.author, r.org, r.purpose, r.why_notable].join(' '); });
    return text.toLowerCase();
  }

  /**
   * detailFilter tells whether entry d passes the Details chip.
   * @param {object} d a recon tool entry
   */
  function detailFilter(d) {
    if (state.details === 'all') return true;
    var hasDetails = (d.details || []).length > 0;
    return state.details === 'with' ? hasDetails : !hasDetails;
  }

  /**
   * langFilter tells whether entry d passes the Language chip (a tool passes
   * when any of its detail records has that primary language).
   * @param {object} d a recon tool entry
   */
  function langFilter(d) {
    if (state.lang === 'all') return true;
    return (d.details || []).some(function (r) { return primaryLanguage(r) === state.lang; });
  }

  /**
   * matches applies the sidebar step, search text and chips to entry d.
   * @param {object} d a tool or category entry
   * @param {boolean} useToolFilters true for recon tools (adds status and license chips)
   * @returns {boolean} true when d should be shown
   */
  function matches(d, useToolFilters) {
    if (state.cat !== 'All' && d.c !== state.cat) return false;
    if (state.q && searchText(d).indexOf(state.q) < 0) return false;
    if (!verFilter(d)) return false;
    if (!useToolFilters) return true;
    return (state.status === 'all' || d.s === state.status) && licFilter(d) && detailFilter(d) && langFilter(d);
  }

  /**
   * linkHTML builds the link footer of a recon tool card.
   * @param {object} d a recon tool entry
   * @returns {string} HTML for the link row (GitHub/site, or website for proprietary tools)
   */
  function linkHTML(d) {
    var html = '<div class="linkrow">';
    if (d.oss) {
      html += '<span class="lbl">GitHub:</span> <a href="' + d.gh + '" target="_blank" rel="noopener">repo</a>';
      if (d.site && d.site !== d.gh) html += ' · <a href="' + d.site + '" target="_blank" rel="noopener">site</a>';
    } else {
      html += '<span class="lbl">Proprietary ·</span> <a href="' + d.site + '" target="_blank" rel="noopener">website</a>';
    }
    return html + '</div>';
  }

  /**
   * primaryLanguage reduces a detail record's free-text language ("C (core);
   * Lua (NSE scripts)") to its first word, so the Language chips stay short.
   * @param {object} record a tool detail record
   * @returns {string} the first word, or '' when the record has no language
   */
  function primaryLanguage(record) {
    return (record.language || '').split(/[\s(;/,]/)[0];
  }

  /**
   * detailLinksHTML renders a detail record's links as a link row.
   * @param {object} record a tool detail record
   * @returns {string} HTML, or '' when the record has no links
   */
  function detailLinksHTML(record) {
    var entries = Object.keys(record.links || {});
    if (!entries.length) return '';
    return '<div class="linkrow">' + entries.map(function (label) {
      return '<a href="' + esc(record.links[label]) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + ' ↗</a>';
    }).join('') + '</div>';
  }

  /**
   * detailMetaHTML renders a record's author, org, year and language as a
   * labelled list (not pills, because author and org strings can be long).
   * @param {object} record a tool detail record
   * @returns {string} HTML for a <dl>, or '' when the record has none of them
   */
  function detailMetaHTML(record) {
    var rows = [['Author', record.author], ['Org', record.org], ['Year', record.year], ['Language', record.language]]
      .filter(function (row) { return row[1]; })
      .map(function (row) { return '<div><dt>' + esc(row[0]) + '</dt><dd>' + esc(row[1]) + '</dd></div>'; });
    return rows.length ? '<dl class="detail-meta">' + rows.join('') + '</dl>' : '';
  }

  /**
   * detailHTML renders one tool record as a collapsible block: the meta
   * list, the "why notable" story, and its links.
   * @param {object} record a tool detail record
   * @returns {string} HTML for a <details> block
   */
  function detailHTML(record) {
    return '<details class="detail"><summary>Origin: ' + esc(record.name) + '</summary>' +
      detailMetaHTML(record) +
      (record.why_notable ? '<p class="why">' + esc(record.why_notable) + '</p>' : '') +
      detailLinksHTML(record) + '</details>';
  }

  /**
   * detailsBlockHTML renders every detail record of a tool, or '' for none.
   * @param {object} d a tool entry with an optional details array
   */
  function detailsBlockHTML(d) {
    return (d.details || []).map(detailHTML).join('');
  }

  /**
   * cardHTML renders one recon tool as a card.
   * @param {object} d a recon tool entry
   * @returns {string} card HTML
   */
  function cardHTML(d) {
    var foot = '';
    if (d.r) foot = '<div class="repo"><span class="dot"></span>cross-check: <a href="' + d.r.u + '" target="_blank" rel="noopener">' + d.r.t + '</a></div>';
    else if (d.src) foot = '<div class="src">source: <b>' + d.src + '</b></div>';
    return '<div class="card k-' + d.s + '">' +
      '<p class="tname">' + d.n + '</p><p class="tcat">' + d.c + '</p>' +
      '<div class="pillrow">' +
      '<span class="status-pill ' + d.s + '">' + STATUS_LABEL[d.s] + '</span>' +
      '<span class="act-pill ' + d.act + '">' + (d.act === 'passive' ? 'Passive' : 'Active') + '</span>' +
      '<span class="lic-pill ' + (d.oss ? 'oss' : 'prop') + '">' + (d.oss ? 'Open-source' : 'Proprietary') + '</span>' +
      '<span class="ver-pill verified">✓ Verified</span>' +
      ((d.details || []).length ? '<span class="pill amber">Details</span>' : '') + '</div>' +
      '<p class="why">' + d.w + '</p>' + foot + linkHTML(d) + detailsBlockHTML(d) + '</div>';
  }

  /**
   * catCardHTML renders one BlackArch category (count only, unverified) as a card.
   * @param {object} d a category entry made by bc() in the data file
   * @returns {string} card HTML
   */
  function catCardHTML(d) {
    return '<div class="card k-unverified"><p class="tname">' + d.n + '</p>' +
      '<div class="pillrow"><span class="countchip">' + d.count + ' tools</span><span class="ver-pill unverified">? Unverified</span></div>' +
      '<p class="why">' + d.w + '</p>' +
      '<div class="linkrow"><span class="lbl">GitHub:</span> <a href="' + d.gh + '" target="_blank" rel="noopener">BlackArch repo</a> · ' +
      '<a href="' + d.site + '" target="_blank" rel="noopener">category page</a></div></div>';
  }

  /**
   * subheadHTML renders a divider heading inside the card grid.
   * @param {string} dotClass dotp (passive) or dota (active)
   * @param {string} label heading text
   */
  function subheadHTML(dotClass, label) {
    return '<div class="subhead"><span class="' + dotClass + '"></span> ' + label + ' <span class="line"></span></div>';
  }

  /** buildCards fills the grid with the cards for the current phase, step and filters. */
  function buildCards() {
    var phase = currentPhase();
    if (phase.type !== 'recon') {
      grid.innerHTML = phase.data.filter(function (d) { return matches(d, false); }).map(catCardHTML).join('');
      return;
    }
    var pool = phase.data.filter(function (d) { return matches(d, true); });
    if (state.cat === 'All') { grid.innerHTML = pool.map(cardHTML).join(''); return; }
    var passive = pool.filter(function (d) { return d.act === 'passive'; });
    var active = pool.filter(function (d) { return d.act === 'active'; });
    var html = '';
    if (passive.length) html += subheadHTML('dotp', 'Passive recon') + passive.map(cardHTML).join('');
    if (active.length) html += subheadHTML('dota', 'Active recon') + active.map(cardHTML).join('');
    grid.innerHTML = html;
  }

  /**
   * compareTableHTML renders the side-by-side comparison table.
   * @param {Array} rows recon tools to show
   */
  function compareTableHTML(rows) {
    var html = '<table class="cmp"><thead><tr><th>Tool</th><th>Status</th><th>Recon type</th><th>License</th><th>Input</th><th>Output</th><th>Unique finding</th></tr></thead><tbody>';
    rows.forEach(function (d) {
      var license = d.oss ? '<a href="' + d.gh + '" target="_blank" rel="noopener">OSS</a>' : '<a href="' + d.site + '" target="_blank" rel="noopener">Proprietary</a>';
      html += '<tr><td class="tool">' + d.n + '</td><td><span class="badge ' + d.s + '">' + STATUS_LABEL[d.s] + '</span></td><td>' + d.act + '</td><td>' + license +
        '</td><td>' + (d.in || '—') + '</td><td>' + (d.out || '—') + '</td><td>' + (d.uniq || d.w) + '</td></tr>';
    });
    return html + '</tbody></table>';
  }

  /**
   * coverageTableHTML renders the tool-by-field coverage matrix, weakest tool first.
   * @param {Array} rows recon tools to show
   */
  function coverageTableHTML(rows) {
    var fields = data.FIELDS[state.cat] || [];
    var sorted = rows.slice().sort(function (a, b) { return (a.cov || []).length - (b.cov || []).length; });
    var html = '<table class="cov"><thead><tr><th>Tool (low→high)</th>' + fields.map(function (f) { return '<th>' + f + '</th>'; }).join('') + '<th>Total</th></tr></thead><tbody>';
    sorted.forEach(function (d) {
      var covered = new Set(d.cov || []);
      html += '<tr><td class="tool">' + d.n + '</td>';
      fields.forEach(function (f, i) { html += '<td class="' + (covered.has(i) ? 'yes' : 'no') + '">' + (covered.has(i) ? '✓' : '—') + '</td>'; });
      html += '<td class="total">' + (d.cov || []).length + '/' + fields.length + '</td></tr>';
    });
    return html + '</tbody></table>';
  }

  /** renderTable shows the compare or coverage table (recon phase, one step selected). */
  function renderTable() {
    grid.style.display = 'none'; tablewrap.style.display = 'block'; empty.style.display = 'none';
    if (state.cat === 'All') { tablewrap.innerHTML = '<p class="pickstep">Pick a step on the left.</p>'; countEl.innerHTML = 'Select a step'; return; }
    var rows = RECON_DATA.filter(function (d) { return matches(d, true); });
    if (rows.length === 0) { tablewrap.innerHTML = '<p class="pickstep">No tools match these filters.</p>'; countEl.innerHTML = ''; return; }
    var isCompare = state.view === 'compare';
    tablewrap.innerHTML = isCompare ? compareTableHTML(rows) : coverageTableHTML(rows);
    countEl.innerHTML = (isCompare ? 'Comparing' : 'Ranking') + ' <b>' + rows.length + '</b> tools in <b>' + state.cat + '</b>';
  }

  /**
   * renderCards shows the card grid and the result count.
   * @param {boolean} animate fade the cards in when true
   */
  function renderCards(animate) {
    grid.style.display = 'grid'; tablewrap.style.display = 'none';
    buildCards();
    var cards = grid.querySelectorAll('.card');
    if (animate) {
      cards.forEach(function (card) {
        card.style.opacity = 0; card.style.transform = 'translateY(6px)';
        requestAnimationFrame(function () { card.style.opacity = 1; card.style.transform = 'translateY(0)'; });
      });
    }
    empty.style.display = cards.length === 0 ? 'block' : 'none';
    countEl.innerHTML = 'Showing <b>' + cards.length + '</b> items in <b>' + state.phase + '</b>' + (state.cat !== 'All' ? ' · ' + state.cat.replace('blackarch-', '') : '');
  }

  /**
   * render redraws everything that depends on state: sidebar, chip rows,
   * view toggle, note, and the card or table view.
   * @param {boolean} animate fade the cards in when true
   */
  function render(animate) {
    var isRecon = currentPhase().type === 'recon';
    buildSteps();
    statusRow.style.display = isRecon ? 'flex' : 'none';
    licenseRow.style.display = isRecon ? 'flex' : 'none';
    buildChipRow(statusRow, STATUS_OPTIONS, 'status');
    buildChipRow(licenseRow, LICENSE_OPTIONS, 'lic');
    buildChipRow(verifiedRow, VERIFIED_OPTIONS, 'verified');
    buildChipRow(detailsRow, DETAILS_OPTIONS, 'details');
    buildChipRow(langRow, [['all', 'All languages']].concat(languages.map(function (l) { return [l, l]; })), 'lang');
    detailsRow.style.display = isRecon ? 'flex' : 'none';
    langRow.style.display = isRecon ? 'flex' : 'none';
    viewToggle.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === state.view);
      b.disabled = !isRecon && b.dataset.view !== 'cards';
    });
    noteArea.innerHTML = isRecon ? '' : '<p class="notebox">Category-level dump from BlackArch\'s official groupings — tool counts are real (blackarch.org, counted 15 Apr 2024), but individual tools inside each category haven\'t been reviewed yet. Tell me which category to expand and I\'ll verify its tools one by one, same as we did for Reconnaissance.</p>';
    if (isRecon && state.view !== 'cards') renderTable();
    else renderCards(animate);
  }

  /**
   * normalizeName turns a tool name into a comparison key: lower case, no
   * parenthesised notes, no punctuation, no trailing "s"/"ing" (so "Google
   * Dorks" meets "Google dorking").
   * @param {string} name a tool name from either source
   */
  function normalizeName(name) {
    return name.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '').replace(/(ing|s)$/, '');
  }

  /**
   * nameKeys splits a combined list name ("gau / waybackurls") into one key per tool.
   * @param {string} name a tool name from the list
   */
  function nameKeys(name) {
    return name.split('/').map(normalizeName);
  }

  /**
   * attachDetails links each detail record to the list tool(s) it names
   * (d.details). Records that match no tool are ignored.
   * @param {Array} records detail records shown on this page
   */
  function attachDetails(records) {
    records.forEach(function (record) {
      var key = normalizeName(record.name);
      RECON_DATA.forEach(function (d) {
        if (nameKeys(d.n).indexOf(key) >= 0) (d.details = d.details || []).push(record);
      });
    });
  }

  /**
   * useRecords wires the loaded records into the page: matches them to tools,
   * fills the Language chips, and redraws.
   * @param {Array} records detail records shown on this page
   */
  function useRecords(records) {
    attachDetails(records);
    languages = records.map(primaryLanguage).filter(function (l, i, all) { return l && all.indexOf(l) === i; }).sort();
    render(false);
  }

  /**
   * loadRecords fetches the library-tools manifest and every record it lists,
   * and resolves with the records whose show_on includes this page.
   * Records that fail to load are skipped; the promise rejects when the
   * manifest itself is unreachable.
   */
  function loadRecords() {
    return Library.fetchJSON(RECORDS_BASE + 'manifest.json').then(function (files) {
      return Promise.allSettled(files.map(function (f) { return Library.fetchJSON(RECORDS_BASE + f); }));
    }).then(function (results) {
      return results.filter(function (r) { return r.status === 'fulfilled'; }).map(function (r) { return r.value; })
        .filter(function (r) { return (r.show_on || []).indexOf(SITE_ID) >= 0; });
    });
  }

  viewToggle.querySelectorAll('button').forEach(function (b) {
    b.onclick = function () { if (!b.disabled) { state.view = b.dataset.view; render(true); } };
  });
  searchEl.addEventListener('input', function (e) { state.q = e.target.value.trim().toLowerCase(); render(false); });

  render(false);
  loadRecords().then(useRecords).catch(function (err) { console.warn('[vapt] tool details unavailable:', err.message); });
})();
