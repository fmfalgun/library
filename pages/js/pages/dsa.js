/*
 * File purpose: behaviour of dsa.html - loads the dsa-library API index, then
 * shows concepts, problems and discussions as cards (filter by section, tag and
 * search) and an item view with its complexity table, links in both directions
 * and the item's Markdown body. Items appear only when their show_on lists the
 * portfolio. If the API cannot be loaded the page says so and nothing else on
 * the site is affected. The Markdown renderer below is a copy of the one in
 * gate.js (the page rules allow no shared extra files); extract it into a
 * shared place if a third page needs it.
 */
(function () {
  'use strict';

  var esc = Library.esc;
  var el = Library.el;

  var DEFAULT_API = 'https://fmfalgun.github.io/dsa-library/api/v1/';
  var SITE_ID = 'portfolio';
  var TOOLKIT_URL = 'https://fmfalgun.github.io/toolkit.html';
  var SECTIONS = [['concept', 'Concepts'], ['problem', 'Problems'], ['discussion', 'Discussions']];
  var STATUS_PILL = { stub: '', draft: 'amber', solved: 'green', answered: 'green', reviewed: 'green' };
  var LINK_LABELS = [
    ['prerequisites', 'Prerequisites'], ['required_by', 'Required by'], ['related', 'Related'],
    ['variant_of', 'Variant of'], ['variants', 'Variants'], ['uses', 'Uses'], ['used_by', 'Used by problems'],
    ['similar', 'Similar problems'], ['follow_up_of', 'Follow-up of'], ['follow_ups', 'Follow-ups'],
    ['about', 'About'], ['discussed_in', 'Discussed in']
  ];

  var stepsNav = document.getElementById('steps');
  var searchEl = document.getElementById('search');
  var toolbarEl = document.getElementById('toolbar');
  var tagRow = document.getElementById('tagRow');
  var countEl = document.getElementById('count');
  var content = document.getElementById('content');

  var data = null; // { items: [public index entries with slug] } once loaded
  var searchText = '';
  var renderId = 0; // bumped on every render so late async results are dropped
  var textCache = {}; // item URL -> Markdown body

  /* ---------- API loading ---------- */

  /**
   * apiBase returns the API folder URL. A `?api=` query parameter may point at
   * another folder on fmfalgun.github.io (used to test the failure path); any
   * other host is ignored so the page can only read this site's JSON.
   * @returns {string} base URL ending in a slash
   */
  function apiBase() {
    var asked = new URLSearchParams(location.search).get('api');
    var base = asked && asked.indexOf('https://fmfalgun.github.io/') === 0 ? asked : DEFAULT_API;
    return base.slice(-1) === '/' ? base : base + '/';
  }

  /**
   * isPublic says whether an index item may be shown on this site.
   * @param {object} item an index entry
   * @returns {boolean} true when its show_on lists the portfolio
   */
  function isPublic(item) { return (item.show_on || []).indexOf(SITE_ID) !== -1; }

  /**
   * loadData fetches index.json once per visit.
   * @returns {Promise<object>} { items } with the public items, sorted by title
   * Errors: rejects when the file cannot be fetched or parsed.
   */
  function loadData() {
    return Library.fetchJSON(apiBase() + 'index.json').then(function (index) {
      var items = Object.keys(index.items).map(function (slug) { return Object.assign({ slug: slug }, index.items[slug]); })
        .filter(isPublic)
        .sort(function (a, b) { return a.title.localeCompare(b.title); });
      return { items: items };
    });
  }

  /**
   * itemBySlug looks up a public item.
   * @param {string} slug item slug
   * @returns {object|undefined} the index entry, or undefined when unknown or hidden
   */
  function itemBySlug(slug) {
    return data.items.find(function (item) { return item.slug === slug; });
  }

  /* ---------- Markdown ---------- */

  /**
   * stashMath replaces TeX spans in Markdown text with placeholders, so the
   * Markdown rules never touch the TeX and the text stays free of stray markup.
   * @param {string} source Markdown text
   * @param {Array} store receives { tex, display, raw } per span; the index is in the placeholder
   * @returns {string} the text with \u0001<n>\u0002 in place of each math span
   */
  function stashMath(source, store) {
    function keep(raw, tex, display) {
      store.push({ tex: tex.trim(), display: display, raw: raw });
      return '\u0001' + (store.length - 1) + '\u0002';
    }
    var withDisplay = source.replace(/\$\$([\s\S]+?)\$\$/g, function (raw, tex) { return keep(raw, tex, true); });
    return withDisplay.replace(/\$([^\s$](?:[^$\n]*?[^\s$])?)\$/g, function (raw, tex) { return keep(raw, tex, false); });
  }

  /**
   * mathHtml turns one stashed span into HTML: KaTeX output when available,
   * otherwise the original TeX in a code element.
   * @param {object} span an entry of the math store
   * @returns {string} HTML
   */
  function mathHtml(span) {
    if (!window.katex) return '<code>' + esc(span.raw) + '</code>';
    return window.katex.renderToString(span.tex, { displayMode: span.display, throwOnError: false, trust: false });
  }

  /**
   * restoreMath swaps placeholders back for rendered math (or raw text in code).
   * @param {string} html text containing placeholders
   * @param {Array} store the math store from stashMath
   * @param {boolean} asRaw true inside code: put the original `$..$` text back
   * @returns {string} text with math restored
   */
  function restoreMath(html, store, asRaw) {
    return html.replace(/\u0001(\d+)\u0002/g, function (whole, number) {
      var span = store[Number(number)];
      return asRaw ? esc(span.raw) : mathHtml(span);
    });
  }

  /**
   * itemHref builds the in-page link to an item.
   * @param {string} slug item slug
   * @returns {string} an href such as "#item=arrays"
   */
  function itemHref(slug) {
    return '#item=' + encodeURIComponent(slug);
  }

  /**
   * linkHtml renders one Markdown link. Web links open in a new tab, `<slug>.md`
   * links to known items stay in the page, everything else shows only its text.
   * @param {string} label already-escaped link text
   * @param {string} url already-escaped URL
   * @returns {string} an anchor or the plain label
   */
  function linkHtml(label, url) {
    if (/^https?:\/\//i.test(url)) return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
    var match = /^([a-z0-9-]+)\.md$/.exec(url);
    if (match && itemBySlug(match[1])) return '<a href="' + esc(itemHref(match[1])) + '">' + label + '</a>';
    return label;
  }

  /**
   * inline renders the inline Markdown of one text: code, links, bold, italic, math.
   * @param {string} text Markdown text possibly holding math placeholders
   * @param {Array} store the math store from stashMath
   * @returns {string} HTML
   */
  function inline(text, store) {
    var codes = [];
    var html = esc(text).replace(/`([^`]+)`/g, function (whole, code) {
      codes.push('<code>' + restoreMath(code, store, true) + '</code>');
      return '\u0003' + (codes.length - 1) + '\u0004';
    });
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (whole, label, url) { return linkHtml(label, url); });
    html = html.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, function (whole, url) { return linkHtml(url, url); });
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*\w])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
    html = html.replace(/\u0003(\d+)\u0004/g, function (whole, number) { return codes[Number(number)]; });
    return restoreMath(html, store, false);
  }

  /**
   * renderInline renders a short Markdown fragment (an answer option) with math.
   * @param {string} text Markdown text, may hold $..$ math
   * @returns {string} HTML without a paragraph wrapper
   */
  function renderInline(text) {
    var store = [];
    return inline(stashMath(text, store), store);
  }

  /**
   * tableCells splits one Markdown table row into its trimmed cells.
   * @param {string} line a row such as "| a | b |"
   * @returns {string[]} the cell texts
   */
  function tableCells(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (cell) { return cell.trim(); });
  }

  /**
   * tableHtml renders a table block (header row, separator, body rows).
   * @param {string[]} rows the lines of the table, separator included at index 1
   * @param {Array} store math store
   * @returns {string} HTML table
   */
  function tableHtml(rows, store) {
    var head = tableCells(rows[0]).map(function (cell) { return '<th>' + inline(cell, store) + '</th>'; }).join('');
    var body = rows.slice(2).map(function (row) {
      return '<tr>' + tableCells(row).map(function (cell) { return '<td>' + inline(cell, store) + '</td>'; }).join('') + '</tr>';
    }).join('');
    return '<table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  /**
   * takeWhile collects consecutive lines from `start` while `test` holds.
   * @param {string[]} lines all lines
   * @param {number} start first line to look at
   * @param {function} test predicate on a line
   * @returns {string[]} the run of matching lines (possibly empty)
   */
  function takeWhile(lines, start, test) {
    var run = [];
    while (start + run.length < lines.length && test(lines[start + run.length])) run.push(lines[start + run.length]);
    return run;
  }

  var RULES = {
    bullet: /^\s*[-*]\s+(.*)$/,
    numbered: /^\s*\d+[.)]\s+(.*)$/,
    quote: /^>\s?(.*)$/,
    separator: /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/
  };

  /**
   * listHtml renders a run of list lines as one ul or ol.
   * @param {string[]} run the list lines
   * @param {RegExp} rule bullet or numbered rule that matched them
   * @param {Array} store math store
   * @returns {string} HTML list
   */
  function listHtml(run, rule, store) {
    var tag = rule === RULES.bullet ? 'ul' : 'ol';
    var items = run.map(function (line) { return '<li>' + inline(rule.exec(line)[1], store) + '</li>'; });
    return '<' + tag + '>' + items.join('') + '</' + tag + '>';
  }

  /**
   * blockAt parses the one block that starts at line `start`.
   * @param {string[]} lines all lines
   * @param {number} start index of the first line of the block
   * @param {Array} store math store
   * @returns {{html: string, next: number}} the block's HTML and the index after it
   */
  function blockAt(lines, start, store) {
    var line = lines[start];
    var heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      var level = Math.min(heading[1].length + 1, 4);
      return { html: '<h' + level + '>' + inline(heading[2], store) + '</h' + level + '>', next: start + 1 };
    }
    if (line.trim().indexOf('```') === 0) {
      var code = takeWhile(lines, start + 1, function (row) { return row.trim().indexOf('```') !== 0; });
      return { html: '<pre>' + restoreMath(esc(code.join('\n')), store, true) + '</pre>', next: start + code.length + 2 };
    }
    return listOrParagraph(lines, start, store);
  }

  /**
   * listOrParagraph parses lists, quotes, tables and plain paragraphs.
   * @param {string[]} lines all lines
   * @param {number} start index of the first line of the block
   * @param {Array} store math store
   * @returns {{html: string, next: number}} the block's HTML and the index after it
   */
  function listOrParagraph(lines, start, store) {
    var line = lines[start];
    var rule = [RULES.bullet, RULES.numbered].find(function (candidate) { return candidate.test(line); });
    if (rule) {
      var run = takeWhile(lines, start, function (row) { return rule.test(row); });
      return { html: listHtml(run, rule, store), next: start + run.length };
    }
    if (RULES.quote.test(line)) {
      var quoted = takeWhile(lines, start, function (row) { return RULES.quote.test(row); });
      var quote = quoted.map(function (row) { return RULES.quote.exec(row)[1]; }).join(' ');
      return { html: '<blockquote>' + inline(quote, store) + '</blockquote>', next: start + quoted.length };
    }
    if (line.indexOf('|') !== -1 && RULES.separator.test(lines[start + 1] || '')) {
      var rows = takeWhile(lines, start, function (row) { return row.indexOf('|') !== -1; });
      return { html: tableHtml(rows, store), next: start + rows.length };
    }
    var paragraph = takeWhile(lines, start, function (row) { return row.trim() !== '' && !/^(#{1,6}\s|```|\s*[-*]\s|\s*\d+[.)]\s|>)/.test(row); });
    return { html: '<p>' + inline(paragraph.join(' '), store) + '</p>', next: start + Math.max(paragraph.length, 1) };
  }

  /**
   * renderMarkdown converts Markdown (with $..$ and $$..$$ math) to HTML.
   * Supports headings, paragraphs, flat lists, quotes, tables, fenced code,
   * bold, italic, inline code and links. Text is HTML-escaped first, so
   * content can never inject markup of its own.
   * @param {string} markdown source text without front matter
   * @returns {string} HTML for a .prose container
   */
  function renderMarkdown(markdown) {
    var store = [];
    var lines = stashMath(markdown, store).split('\n');
    var out = [];
    var at = 0;
    while (at < lines.length) {
      if (lines[at].trim() === '') { at += 1; continue; }
      var block = blockAt(lines, at, store);
      out.push(block.html);
      at = block.next;
    }
    return out.join('\n');
  }

  /**
   * stripFrontMatter removes the leading `---` YAML block from an item file.
   * @param {string} text the whole .md file
   * @returns {string} the Markdown body
   */
  function stripFrontMatter(text) {
    var match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(text);
    return match ? text.slice(match[0].length) : text;
  }

  /**
   * fetchItemText fetches an item's Markdown once per visit.
   * @param {object} item index entry with a `url`
   * @returns {Promise<string>} the Markdown body (front matter removed)
   * Errors: rejects on a network failure or a non-2xx status.
   */
  function fetchItemText(item) {
    if (textCache[item.url]) return Promise.resolve(textCache[item.url]);
    return fetch(item.url, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (text) {
      textCache[item.url] = stripFrontMatter(text);
      return textCache[item.url];
    });
  }

  /* ---------- Router ---------- */

  /**
   * readHash parses the URL hash into the page state.
   * @returns {{tab: string, item: string, tag: string}} state (tab defaults to "concept")
   */
  function readHash() {
    var params = new URLSearchParams(location.hash.replace(/^#/, ''));
    return { tab: params.get('tab') || 'concept', item: params.get('item') || '', tag: params.get('tag') || '' };
  }

  /**
   * hashFor builds the hash text for a state patch applied to the current state.
   * @param {object} patch fields to change (tab, item, tag)
   * @returns {string} a hash such as "#tab=problem&tag=arrays"
   */
  function hashFor(patch) {
    var next = Object.assign(readHash(), patch);
    var params = new URLSearchParams();
    Object.keys(next).forEach(function (key) { if (next[key] !== '') params.set(key, next[key]); });
    return '#' + params.toString();
  }

  /**
   * navLink builds an anchor that moves to a new state.
   * @param {string} text link text
   * @param {object} patch state change the link makes
   * @param {string} [className] class attribute
   * @returns {HTMLAnchorElement} the link
   */
  function navLink(text, patch, className) {
    var link = el('a', className, text);
    link.href = hashFor(patch);
    return link;
  }

  /**
   * externalLink builds a link that opens in a new tab.
   * @param {string} text link text
   * @param {string} url target
   * @returns {HTMLAnchorElement} the link
   */
  function externalLink(text, url) {
    var link = el('a', '', text);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  /**
   * pill builds a small status label.
   * @param {string} text label text
   * @param {string} [color] pill color class (green, amber, blue, red, violet)
   * @returns {HTMLElement} the pill
   */
  function pill(text, color) { return el('span', 'pill ' + (color || ''), text); }

  /**
   * showMessage replaces the content area with a note.
   * @param {string} text the message
   */
  function showMessage(text) {
    countEl.textContent = '';
    tagRow.replaceChildren();
    content.replaceChildren(el('div', 'notebox', text));
  }

  /**
   * itemsOfKind lists the public items of one kind.
   * @param {string} kind concept, problem or discussion
   * @returns {object[]} index entries
   */
  function itemsOfKind(kind) {
    return data.items.filter(function (item) { return item.kind === kind; });
  }

  /* ---------- Sidebar, tags, toolbar ---------- */

  /**
   * renderSidebar draws the section switcher with item counts and marks the current one.
   * @param {object} state the current hash state
   */
  function renderSidebar(state) {
    stepsNav.replaceChildren(el('div', 'navlabel', 'SECTIONS'));
    SECTIONS.forEach(function (section) {
      var link = navLink(section[1] + ' (' + itemsOfKind(section[0]).length + ')', { tab: section[0], item: '', tag: '' }, 'step-btn');
      link.classList.toggle('active', section[0] === state.tab && !state.item);
      stepsNav.appendChild(link);
    });
  }

  /**
   * renderTagRow shows one chip per tag used in the section, plus "all".
   * @param {object} state the current hash state
   */
  function renderTagRow(state) {
    var tags = {};
    itemsOfKind(state.tab).forEach(function (item) { (item.tags || []).forEach(function (tag) { tags[tag] = true; }); });
    tagRow.replaceChildren();
    ['all'].concat(Object.keys(tags).sort()).forEach(function (tag) {
      var chip = navLink(tag, { tag: tag === 'all' ? '' : tag }, 'chip');
      chip.classList.toggle('active', (tag === 'all' && !state.tag) || tag === state.tag);
      tagRow.appendChild(chip);
    });
  }

  /* ---------- List view ---------- */

  /**
   * metaPills builds the kind-specific pills of an item card.
   * @param {object} item index entry
   * @returns {HTMLElement} a pill row
   */
  function metaPills(item) {
    var row = el('div', 'pillrow');
    row.appendChild(pill(item.status, STATUS_PILL[item.status]));
    if (item.kind === 'concept' && item.type) row.appendChild(el('span', 'countchip', item.type));
    if (item.kind === 'problem') {
      if (item.difficulty) row.appendChild(el('span', 'countchip', item.difficulty));
      row.appendChild(el('span', 'countchip', item.source));
    }
    (item.tags || []).forEach(function (tag) { row.appendChild(el('span', 'countchip', tag)); });
    return row;
  }

  /**
   * itemCard builds one item card: title, pills and summary (or the question for a discussion).
   * @param {object} item index entry
   * @returns {HTMLElement} the card
   */
  function itemCard(item) {
    var card = el('div', 'card');
    var title = el('h3', 'tname');
    title.appendChild(navLink(item.title, { item: item.slug }));
    card.appendChild(title);
    card.appendChild(metaPills(item));
    card.appendChild(el('p', 'why', item.kind === 'discussion' ? item.question : item.summary));
    return card;
  }

  /**
   * renderList lists the section's items filtered by tag and search text.
   * @param {object} state the current hash state
   */
  function renderList(state) {
    var query = searchText.toLowerCase().trim();
    var shown = itemsOfKind(state.tab).filter(function (item) {
      var haystack = (item.title + ' ' + (item.summary || '') + ' ' + (item.question || '') + ' ' + (item.tags || []).join(' ')).toLowerCase();
      return (!state.tag || (item.tags || []).indexOf(state.tag) !== -1) && haystack.indexOf(query) !== -1;
    });
    renderTagRow(state);
    countEl.textContent = shown.length + ' item' + (shown.length === 1 ? '' : 's');
    if (!shown.length) { content.replaceChildren(el('div', 'notebox', 'Nothing matches yet.')); return; }
    var grid = el('div', 'grid');
    shown.forEach(function (item) { grid.appendChild(itemCard(item)); });
    content.replaceChildren(grid);
  }

  /* ---------- Item view ---------- */

  /**
   * complexityTable builds the operation / time / space table of a concept.
   * @param {object} complexity map operation -> { time, space }
   * @returns {HTMLElement|null} the table wrapper, or null when there is nothing to show
   */
  function complexityTable(complexity) {
    var operations = Object.keys(complexity || {});
    if (!operations.length) return null;
    var wrap = el('div', 'tablewrap');
    var table = el('table');
    var head = el('tr');
    ['Operation', 'Time', 'Space'].forEach(function (name) { head.appendChild(el('th', '', name)); });
    table.appendChild(head);
    operations.forEach(function (operation) {
      var row = el('tr');
      [operation, complexity[operation].time, complexity[operation].space].forEach(function (cell) { row.appendChild(el('td', '', cell)); });
      table.appendChild(row);
    });
    wrap.appendChild(table);
    return wrap;
  }

  /**
   * linkRow builds "Label: item, item" for one link field; targets that are not shown stay plain text.
   * @param {string} label row label
   * @param {string[]|string|null} slugs one or many target slugs
   * @returns {HTMLElement|null} the row, or null when the field is empty
   */
  function linkRow(label, slugs) {
    var list = [].concat(slugs || []);
    if (!list.length) return null;
    var row = el('div', 'linkrow');
    row.appendChild(el('span', 'lbl', label + ':'));
    list.forEach(function (slug) {
      var target = itemBySlug(slug);
      if (target) row.appendChild(navLink(target.title, { tab: target.kind, item: slug, tag: '' }));
      else row.appendChild(el('span', '', slug));
    });
    return row;
  }

  /**
   * outsideLinks builds the row of links to other sites: the judge page, references and library-data tools.
   * @param {object} item index entry
   * @returns {HTMLElement|null} the row, or null when there are none
   */
  function outsideLinks(item) {
    var row = el('div', 'linkrow');
    if (item.problem_url) row.appendChild(externalLink('Open on ' + item.source, item.problem_url));
    (item.refs || []).forEach(function (ref) { row.appendChild(externalLink(ref.label, ref.url)); });
    (item.xrefs || []).forEach(function (xref) {
      var isTool = xref.ref.indexOf('library-data:tools/') === 0;
      var link = externalLink(xref.ref.replace(/^[^:]+:[^/]+\//, ''), isTool ? TOOLKIT_URL : xref.url);
      if (isTool) link.target = '_top';
      row.appendChild(link);
    });
    return row.childNodes.length ? row : null;
  }

  /**
   * renderItem draws one item: header, complexity, links and the Markdown body.
   * @param {object} state the current hash state
   * @param {number} id render id; late results from older renders are dropped
   */
  function renderItem(state, id) {
    var item = itemBySlug(state.item);
    if (!item) { showMessage('That item is not available.'); return; }
    var body = el('div', 'prose');
    var parts = [navLink('← all ' + item.kind + 's', { item: '', tab: item.kind }, 'backlink'), el('h2', 'section-title', item.title), metaPills(item)];
    parts.push(el('p', 'lead', item.kind === 'discussion' ? item.question : item.summary));
    var table = complexityTable(item.complexity);
    if (table) parts.push(table);
    LINK_LABELS.forEach(function (pair) { var row = linkRow(pair[1], (item.links || {})[pair[0]]); if (row) parts.push(row); });
    var outside = outsideLinks(item);
    if (outside) parts.push(outside);
    parts.push(body);
    tagRow.replaceChildren();
    countEl.textContent = '';
    content.replaceChildren.apply(content, parts);
    body.textContent = 'Loading...';
    fetchItemText(item).then(function (text) {
      if (id === renderId) body.innerHTML = renderMarkdown(text);
    }).catch(function () {
      if (id === renderId) body.textContent = 'DSA library unavailable: this item could not be loaded.';
    });
  }

  /* ---------- Boot ---------- */

  /**
   * render draws the page for the current hash. It does nothing until data is loaded.
   * Side effects: replaces the contents of the sidebar, tag row and content area.
   */
  function render() {
    if (!data) return;
    renderId += 1;
    var state = readHash();
    if (!SECTIONS.some(function (section) { return section[0] === state.tab; })) state.tab = 'concept';
    renderSidebar(state);
    toolbarEl.classList.toggle('hide', Boolean(state.item));
    if (state.item) renderItem(state, renderId);
    else renderList(state);
  }

  /**
   * boot loads the API and draws the page; on failure it shows the unavailable note.
   * Errors: a failed fetch is caught and reported to the visitor, nothing else on the site is touched.
   */
  function boot() {
    showMessage('Loading DSA library...');
    searchEl.addEventListener('input', function () { searchText = searchEl.value; render(); });
    window.addEventListener('hashchange', render);
    loadData().then(function (loaded) {
      data = loaded;
      render();
    }).catch(function () {
      stepsNav.classList.add('hide');
      toolbarEl.classList.add('hide');
      showMessage('DSA library unavailable. Try again later.');
    });
  }

  boot();
})();
