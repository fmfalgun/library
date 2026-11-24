/*
 * File purpose: behaviour of gate.html - loads the gate-library API (index and
 * coverage JSON), then shows syllabus coverage per paper, topic cards, and a
 * topic view with Notes, Revise and Practice tabs. Topic notes are fetched as
 * Markdown from the same repo and rendered here with a small renderer plus
 * KaTeX (pinned version, loaded from a CDN with integrity hashes when the
 * first topic opens). If the API cannot be loaded the page says so and the
 * rest of the site is unaffected.
 */
(function () {
  'use strict';

  var esc = Library.esc;
  var el = Library.el;

  var DEFAULT_API = 'https://fmfalgun.github.io/gate-library/api/v1/';
  var SITE_ID = 'portfolio';
  var PAPER_ORDER = ['da', 'cs', 'ga'];
  var KATEX_BASE = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/';
  var KATEX_JS_SRI = 'sha384-7zkQWkzuo3B5mTepMUcHkMB5jZaolc2xDwL6VFqjFALcbeS9Ggm/Yr2r3Dy4lfFg';
  var KATEX_CSS_SRI = 'sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+';
  var TOOLKIT_URL = 'https://fmfalgun.github.io/toolkit.html';
  var STATUS_PILL = { learning: 'amber', revised: 'blue', 'exam-ready': 'green' };
  var SECTION_REVISE = 'Revision sheet';

  var stepsNav = document.getElementById('steps');
  var viewToggle = document.getElementById('viewToggle');
  var searchEl = document.getElementById('search');
  var toolbarEl = document.getElementById('toolbar');
  var countEl = document.getElementById('count');
  var content = document.getElementById('content');

  var data = null; // { index, coverage, topics: [...] } once loaded
  var searchText = '';
  var renderId = 0; // bumped on every render so late async results are dropped
  var textCache = {}; // topic URL -> Markdown text
  var answerState = {}; // question slug -> { picked, nat, shown }
  var katexPromise = null;

  /* ---------- API loading ---------- */

  /**
   * apiBase returns the API folder URL. A `?api=` query parameter may point at
   * another folder on fmfalgun.github.io (used to test the failure path); any
   * other host is ignored so the page can only read this site's JSON.
   * @returns {string} base URL ending in a slash
   */
  function apiBase() {
    var asked = new URLSearchParams(location.search).get('api');
    var allowed = asked && asked.indexOf('https://fmfalgun.github.io/') === 0;
    var base = allowed ? asked : DEFAULT_API;
    return base.slice(-1) === '/' ? base : base + '/';
  }

  /**
   * isPublic says whether an index item may be shown on this site.
   * @param {object} item an index entry
   * @returns {boolean} true when its show_on lists the portfolio
   */
  function isPublic(item) { return (item.show_on || []).indexOf(SITE_ID) !== -1; }

  /**
   * loadData fetches index.json and coverage.json once per visit.
   * @returns {Promise<object>} { index, coverage, topics } with only public topics
   * Errors: rejects when either file cannot be fetched or parsed.
   */
  function loadData() {
    var base = apiBase();
    return Promise.all([Library.fetchJSON(base + 'index.json'), Library.fetchJSON(base + 'coverage.json')]).then(function (files) {
      var topics = Object.keys(files[0].items).map(function (slug) { return files[0].items[slug]; })
        .filter(function (item) { return item.kind === 'topic' && isPublic(item); })
        .sort(function (a, b) { return a.title.localeCompare(b.title); });
      return { index: files[0], coverage: files[1].papers, topics: topics };
    });
  }

  /**
   * topicBySlug looks up a public topic.
   * @param {string} slug topic slug
   * @returns {object|undefined} the index entry, or undefined when unknown or hidden
   */
  function topicBySlug(slug) {
    return data.topics.find(function (topic) { return topic.slug === slug; });
  }

  /* ---------- Markdown + math ---------- */

  /**
   * ensureKatex loads the pinned KaTeX stylesheet and script once.
   * @returns {Promise<boolean>} true when window.katex is usable, false when the CDN failed
   */
  function ensureKatex() {
    if (katexPromise) return katexPromise;
    katexPromise = new Promise(function (resolve) {
      var css = el('link');
      css.rel = 'stylesheet';
      css.href = KATEX_BASE + 'katex.min.css';
      css.integrity = KATEX_CSS_SRI;
      css.crossOrigin = 'anonymous';
      document.head.appendChild(css);
      var script = el('script');
      script.src = KATEX_BASE + 'katex.min.js';
      script.integrity = KATEX_JS_SRI;
      script.crossOrigin = 'anonymous';
      script.onload = function () { resolve(true); };
      script.onerror = function () { resolve(false); };
      document.head.appendChild(script);
    });
    return katexPromise;
  }

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
   * topicHref builds the in-page link to a topic, keeping the chosen paper.
   * @param {string} slug topic slug
   * @returns {string} an href such as "#topic=matrix-rank&paper=da"
   */
  function topicHref(slug) {
    var params = new URLSearchParams({ topic: slug });
    var paper = readHash().paper;
    if (paper) params.set('paper', paper);
    return '#' + params.toString();
  }

  /**
   * linkHtml renders one Markdown link. Web links open in a new tab, `<slug>.md`
   * links to known topics stay in the page, everything else shows only its text.
   * @param {string} label already-escaped link text
   * @param {string} url already-escaped URL
   * @returns {string} an anchor or the plain label
   */
  function linkHtml(label, url) {
    if (/^https?:\/\//i.test(url)) return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
    var match = /^([a-z0-9-]+)\.md$/.exec(url);
    if (match && topicBySlug(match[1])) return '<a href="' + esc(topicHref(match[1])) + '">' + label + '</a>';
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
   * stripFrontMatter removes the leading `---` YAML block from a topic file.
   * @param {string} text the whole .md file
   * @returns {string} the Markdown body
   */
  function stripFrontMatter(text) {
    var match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(text);
    return match ? text.slice(match[0].length) : text;
  }

  /**
   * sectionOf returns the body of one `## ` section (its heading line included).
   * @param {string} body Markdown body
   * @param {string} name heading text to find
   * @returns {string} the section text, or '' when it is missing
   */
  function sectionOf(body, name) {
    var lines = body.split('\n');
    var start = lines.findIndex(function (line) { return line.trim() === '## ' + name; });
    if (start === -1) return '';
    var rest = lines.slice(start + 1);
    var stop = rest.findIndex(function (line) { return /^## /.test(line); });
    return lines.slice(start, stop === -1 ? lines.length : start + 1 + stop).join('\n');
  }

  /**
   * fetchTopicText fetches a topic's Markdown once per visit.
   * @param {object} topic index entry with a `url`
   * @returns {Promise<string>} the Markdown body (front matter removed)
   * Errors: rejects on a network failure or a non-2xx status.
   */
  function fetchTopicText(topic) {
    if (textCache[topic.url]) return Promise.resolve(textCache[topic.url]);
    return fetch(topic.url, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (text) {
      textCache[topic.url] = stripFrontMatter(text);
      return textCache[topic.url];
    });
  }

  /* ---------- Router ---------- */

  /**
   * readHash parses the URL hash into the page state.
   * @returns {{paper: string, view: string, topic: string, tab: string, q: number}} state
   */
  function readHash() {
    var params = new URLSearchParams(location.hash.replace(/^#/, ''));
    return {
      paper: params.get('paper') || '', view: params.get('view') || 'coverage',
      topic: params.get('topic') || '', tab: params.get('tab') || 'notes',
      q: parseInt(params.get('q') || '0', 10) || 0
    };
  }

  /**
   * hashFor builds the hash text for a state patch applied to the current state.
   * @param {object} patch fields to change (paper, view, topic, tab, q)
   * @returns {string} a hash such as "#paper=da&view=topics"
   */
  function hashFor(patch) {
    var next = Object.assign(readHash(), patch);
    var params = new URLSearchParams();
    Object.keys(next).forEach(function (key) {
      if (next[key] !== '' && next[key] !== 0) params.set(key, next[key]);
    });
    return '#' + params.toString();
  }

  /**
   * go moves to a new state by setting the hash (which triggers a render).
   * @param {object} patch fields to change
   */
  function go(patch) { location.hash = hashFor(patch); }

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

  /* ---------- Shared pieces ---------- */

  /**
   * pill builds a small status label.
   * @param {string} text label text
   * @param {string} [color] pill color class (green, amber, blue, red, violet)
   * @returns {HTMLElement} the pill
   */
  function pill(text, color) { return el('span', 'pill ' + (color || ''), text); }

  /**
   * meterRow builds "label [bar] value" for one percentage.
   * @param {string} label what the bar measures
   * @param {number} percent 0-100
   * @param {boolean} ready true for the green (exam-ready) bar
   * @returns {HTMLElement} the row
   */
  function meterRow(label, percent, ready) {
    var row = el('div', 'meterrow');
    var bar = el('progress', 'meter' + (ready ? ' ready' : ''));
    bar.max = 100;
    bar.value = percent;
    row.appendChild(el('span', '', label));
    row.appendChild(bar);
    row.appendChild(el('b', '', percent + '%'));
    return row;
  }

  /**
   * showMessage replaces the content area with a note.
   * @param {string} text the message
   */
  function showMessage(text) {
    countEl.textContent = '';
    content.replaceChildren(el('div', 'notebox', text));
  }

  /* ---------- Sidebar and toolbar ---------- */

  /**
   * paperCodes lists the papers present in coverage.json in display order.
   * @returns {string[]} codes such as ["da", "cs", "ga"]
   */
  function paperCodes() {
    var known = Object.keys(data.coverage);
    var first = PAPER_ORDER.filter(function (code) { return known.indexOf(code) !== -1; });
    return first.concat(known.filter(function (code) { return first.indexOf(code) === -1; }).sort());
  }

  /**
   * renderSidebar draws the paper switcher and marks the current paper.
   * @param {object} state the current hash state (paper already resolved)
   */
  function renderSidebar(state) {
    stepsNav.replaceChildren(el('div', 'navlabel', 'PAPERS'));
    paperCodes().forEach(function (code) {
      var link = navLink(code.toUpperCase() + ' · ' + data.coverage[code].name, { paper: code, topic: '', tab: '', q: 0 }, 'step-btn');
      link.classList.toggle('active', code === state.paper);
      stepsNav.appendChild(link);
    });
  }

  /**
   * renderToolbar shows the view buttons and search only when no topic is open.
   * @param {object} state the current hash state
   */
  function renderToolbar(state) {
    toolbarEl.classList.toggle('hide', Boolean(state.topic));
    viewToggle.querySelectorAll('button').forEach(function (button) {
      button.classList.toggle('active', button.dataset.view === state.view);
    });
    searchEl.classList.toggle('hide', state.view !== 'topics');
  }

  /* ---------- Coverage view ---------- */

  /**
   * itemRow builds one syllabus item: its text, a status pill and covering topics.
   * @param {object} entry a coverage syllabus item
   * @returns {HTMLElement} the list row
   */
  function itemRow(entry) {
    var row = el('div', 'list-row');
    var ready = entry.best_status === 'exam-ready';
    var label = ready ? 'exam-ready' : (entry.best_status === 'none' ? 'not started' : 'covered');
    var cell = el('div');
    cell.appendChild(pill(label, ready ? 'green' : (entry.best_status === 'none' ? '' : 'amber')));
    entry.covered_by.forEach(function (slug) {
      var topic = topicBySlug(slug);
      if (topic) cell.appendChild(navLink(' ' + topic.title, { topic: slug, tab: 'notes', q: 0 }));
    });
    row.appendChild(el('div', '', entry.text));
    row.appendChild(cell);
    return row;
  }

  /**
   * subjectCard builds one subject's card: two bars and a collapsible item list.
   * @param {object} subject a coverage subject block
   * @returns {HTMLElement} the card
   */
  function subjectCard(subject) {
    var card = el('div', 'card');
    card.appendChild(el('h3', 'tname', subject.name));
    card.appendChild(meterRow('covered', subject.percent_covered, false));
    card.appendChild(meterRow('exam-ready', subject.percent_exam_ready, true));
    var detail = el('details', 'detail');
    detail.appendChild(el('summary', '', 'Syllabus items (' + subject.covered + '/' + subject.items + ' covered)'));
    var list = el('div', 'list');
    subject.syllabus_items.forEach(function (entry) { list.appendChild(itemRow(entry)); });
    detail.appendChild(list);
    card.appendChild(detail);
    return card;
  }

  /**
   * renderCoverage shows the selected paper's overall numbers and one card per subject.
   * @param {object} state the current hash state
   */
  function renderCoverage(state) {
    var paper = data.coverage[state.paper];
    var head = el('div', 'notebox');
    head.appendChild(el('b', '', paper.name + ' (GATE ' + paper.exam_year + ')'));
    head.appendChild(meterRow('covered', paper.percent_covered, false));
    head.appendChild(meterRow('exam-ready', paper.percent_exam_ready, true));
    var link = el('a', '', 'Official syllabus');
    link.href = paper.source_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    head.appendChild(link);
    var grid = el('div', 'grid');
    paper.subjects.forEach(function (subject) { grid.appendChild(subjectCard(subject)); });
    countEl.textContent = paper.covered + ' of ' + paper.items + ' syllabus items covered';
    content.replaceChildren(head, grid);
  }

  /* ---------- Topics view ---------- */

  /**
   * topicCard builds one topic card: title, summary, status, confidence, PYQ years, question count.
   * @param {object} topic index entry of a topic
   * @returns {HTMLElement} the card
   */
  function topicCard(topic) {
    var card = el('div', 'card');
    var title = el('h3', 'tname');
    title.appendChild(navLink(topic.title, { topic: topic.slug, tab: 'notes', q: 0 }));
    var pills = el('div', 'pillrow');
    pills.appendChild(pill(topic.status, STATUS_PILL[topic.status]));
    pills.appendChild(el('span', 'countchip', 'confidence ' + topic.confidence + '/5'));
    var years = topic.pyq_years.length ? 'PYQ ' + topic.pyq_years.join(', ') : 'no PYQ yet';
    pills.appendChild(el('span', 'countchip', years));
    pills.appendChild(el('span', 'countchip', topic.question_stats.total + ' questions'));
    card.appendChild(title);
    card.appendChild(pills);
    card.appendChild(el('p', 'why', topic.summary));
    return card;
  }

  /**
   * renderTopics lists the public topics of the selected paper, filtered by the search text.
   * @param {object} state the current hash state
   */
  function renderTopics(state) {
    var query = searchText.toLowerCase().trim();
    var shown = data.topics.filter(function (topic) {
      var inPaper = topic.papers.indexOf(state.paper) !== -1;
      return inPaper && (topic.title + ' ' + topic.summary + ' ' + topic.slug).toLowerCase().indexOf(query) !== -1;
    });
    countEl.textContent = shown.length + ' topic' + (shown.length === 1 ? '' : 's') + ' for ' + state.paper.toUpperCase();
    if (!shown.length) { content.replaceChildren(el('div', 'notebox', 'No topics match yet.')); return; }
    var grid = el('div', 'grid');
    shown.forEach(function (topic) { grid.appendChild(topicCard(topic)); });
    content.replaceChildren(grid);
  }

  /* ---------- Topic view ---------- */

  /**
   * xrefLinks builds links to the topic's resources in other repos.
   * dsa-library items open their published page; library-data tools open the Toolkit.
   * @param {object} topic index entry with `xrefs` [{ref, url}]
   * @returns {HTMLElement|null} a link row, or null when there are none
   */
  function xrefLinks(topic) {
    if (!topic.xrefs.length) return null;
    var row = el('div', 'linkrow');
    row.appendChild(el('span', 'lbl', 'Related:'));
    topic.xrefs.forEach(function (xref) {
      var isTool = xref.ref.indexOf('library-data:tools/') === 0;
      var link = el('a', '', xref.ref.replace(/^[^:]+:[^/]+\//, ''));
      link.href = isTool ? TOOLKIT_URL : xref.url;
      link.target = isTool ? '_top' : '_blank';
      link.rel = 'noopener noreferrer';
      row.appendChild(link);
    });
    return row;
  }

  /**
   * tabBar builds the Notes / Revise / Practice switch.
   * @param {object} state the current hash state
   * @returns {HTMLElement} the tab group
   */
  function tabBar(state) {
    var group = el('div', 'viewtoggle');
    [['notes', 'Notes'], ['revise', 'Revise'], ['practice', 'Practice']].forEach(function (tab) {
      var button = el('button', tab[0] === state.tab ? 'active' : '', tab[1]);
      button.addEventListener('click', function () { go({ tab: tab[0], q: 0 }); });
      group.appendChild(button);
    });
    return group;
  }

  /**
   * renderTopic draws the topic header and the chosen tab.
   * @param {object} state the current hash state
   * @param {number} id the render id; late results from older renders are dropped
   */
  function renderTopic(state, id) {
    var topic = topicBySlug(state.topic);
    if (!topic) { showMessage('That topic is not available.'); return; }
    var back = navLink('← all topics', { topic: '', tab: '', q: 0, view: 'topics' }, 'backlink');
    var pills = el('div', 'pillrow');
    pills.appendChild(pill(topic.status, STATUS_PILL[topic.status]));
    pills.appendChild(el('span', 'countchip', 'confidence ' + topic.confidence + '/5'));
    var body = el('div', 'prose');
    var tabs = el('div', 'toolbar');
    tabs.appendChild(tabBar(state));
    var parts = [back, el('h2', 'section-title', topic.title), pills, el('p', 'lead', topic.summary)];
    var related = xrefLinks(topic);
    if (related) parts.push(related);
    parts.push(tabs, body);
    countEl.textContent = '';
    content.replaceChildren.apply(content, parts);
    fillTab(topic, state, body, id);
  }

  /**
   * fillTab loads KaTeX and the chosen tab's content into `body`.
   * @param {object} topic index entry
   * @param {object} state the current hash state
   * @param {HTMLElement} body container for the tab
   * @param {number} id render id guarding against stale async results
   */
  function fillTab(topic, state, body, id) {
    body.textContent = 'Loading...';
    var work = state.tab === 'practice' ? Promise.all([ensureKatex()]) : Promise.all([ensureKatex(), fetchTopicText(topic)]);
    work.then(function (results) {
      if (id !== renderId) return;
      body.textContent = '';
      if (state.tab === 'practice') renderPractice(topic, state, body);
      else renderNotes(results[1], state.tab, body);
    }).catch(function () {
      if (id === renderId) body.textContent = 'GATE library unavailable: this topic could not be loaded.';
    });
  }

  /**
   * renderNotes shows the whole body (Notes) or only its Revision sheet (Revise).
   * @param {string} text the topic Markdown body
   * @param {string} tab "notes" or "revise"
   * @param {HTMLElement} body container
   */
  function renderNotes(text, tab, body) {
    var source = tab === 'revise' ? sectionOf(text, SECTION_REVISE) : text;
    body.innerHTML = renderMarkdown(source || 'No revision sheet yet.');
  }

  /* ---------- Practice ---------- */

  /**
   * topicQuestions returns the public questions of a topic, in index order.
   * @param {object} topic index entry with `questions` slugs
   * @returns {object[]} question index entries
   */
  function topicQuestions(topic) {
    return topic.questions.map(function (slug) { return data.index.items[slug]; })
      .filter(function (question) { return question && isPublic(question); });
  }

  /**
   * isCorrect compares a visitor's input with a question's answer.
   * @param {object} question index entry of the question
   * @param {object} given { picked: string[], nat: string }
   * @returns {boolean} true when the input matches (NAT: within {min, max})
   */
  function isCorrect(question, given) {
    if (question.type === 'nat') {
      var value = parseFloat(given.nat);
      return !isNaN(value) && value >= question.answer.min && value <= question.answer.max;
    }
    var want = [].concat(question.answer).sort().join(',');
    return given.picked.slice().sort().join(',') === want;
  }

  /**
   * answerText writes a question's correct answer for display.
   * @param {object} question index entry
   * @returns {string} "B", "A, C" or "3" / "2.9 to 3.1"
   */
  function answerText(question) {
    if (question.type === 'nat') {
      var range = question.answer;
      return range.min === range.max ? String(range.min) : range.min + ' to ' + range.max;
    }
    return [].concat(question.answer).join(', ');
  }

  /**
   * questionHeader shows type, marks, and for a PYQ its year, paper and source link.
   * @param {object} question index entry
   * @returns {HTMLElement} the header row
   */
  function questionHeader(question) {
    var row = el('div', 'pillrow');
    row.appendChild(pill(question.type.toUpperCase(), 'blue'));
    row.appendChild(pill(question.marks + (question.marks === 1 ? ' mark' : ' marks'), ''));
    if (question.origin !== 'pyq') return row;
    var exam = question.exam;
    row.appendChild(el('span', 'countchip', 'GATE ' + exam.year + ' ' + exam.paper.toUpperCase() + ' · session ' + exam.session + ' · Q' + exam.number));
    var source = el('a', '', 'official paper');
    source.href = question.source_url;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    row.appendChild(source);
    return row;
  }

  /**
   * optionButton builds one answer option for an MCQ or MSQ.
   * @param {object} question index entry
   * @param {string} key option letter
   * @param {object} given the visitor's state for this question
   * @param {function} redraw redraws the question after a change
   * @returns {HTMLButtonElement} the option
   */
  function optionButton(question, key, given, redraw) {
    var button = el('button', 'option');
    button.innerHTML = '<span class="optkey">' + key + '</span>' + renderInline(question.options[key]);
    var isRight = [].concat(question.answer).indexOf(key) !== -1;
    var isPicked = given.picked.indexOf(key) !== -1;
    if (isPicked) button.classList.add('chosen');
    if (given.shown) {
      button.disabled = true;
      if (isRight) button.classList.add('right');
      else if (isPicked) button.classList.add('wrong');
    }
    button.addEventListener('click', function () {
      var multi = question.type === 'msq';
      given.picked = multi ? (isPicked ? given.picked.filter(function (k) { return k !== key; }) : given.picked.concat(key)) : [key];
      redraw();
    });
    return button;
  }

  /**
   * answerInputs builds the options (MCQ/MSQ) or the number box (NAT).
   * @param {object} question index entry
   * @param {object} given the visitor's state for this question
   * @param {function} redraw redraws the question after a change
   * @returns {HTMLElement} container with the inputs
   */
  function answerInputs(question, given, redraw) {
    var box = el('div');
    if (question.type === 'nat') {
      var input = el('input', 'search');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.placeholder = 'Your answer (a number)';
      input.value = given.nat;
      input.disabled = given.shown;
      input.addEventListener('input', function () { given.nat = input.value; });
      box.appendChild(input);
      return box;
    }
    Object.keys(question.options).sort().forEach(function (key) { box.appendChild(optionButton(question, key, given, redraw)); });
    return box;
  }

  /**
   * revealBlock builds the verdict, the correct answer and the solution text.
   * @param {object} question index entry
   * @param {object} given the visitor's state for this question
   * @returns {HTMLElement} the block shown after "Show answer"
   */
  function revealBlock(question, given) {
    var block = el('div');
    var answered = question.type === 'nat' ? given.nat.trim() !== '' : given.picked.length > 0;
    if (answered) {
      var ok = isCorrect(question, given);
      block.appendChild(el('div', 'verdict ' + (ok ? 'right' : 'wrong'), ok ? 'Correct' : 'Not quite'));
    }
    block.appendChild(el('div', 'verdict', 'Answer: ' + answerText(question)));
    var solution = el('div', 'prose');
    solution.innerHTML = renderMarkdown(question.solution);
    block.appendChild(solution);
    return block;
  }

  /**
   * questionNav builds Previous / Next buttons and the position text.
   * @param {number} position zero-based question number
   * @param {number} total number of questions
   * @returns {HTMLElement} the navigation row
   */
  function questionNav(position, total) {
    var nav = el('div', 'qnav');
    var previous = el('button', 'chip', '← Previous');
    var next = el('button', 'chip', 'Next →');
    previous.disabled = position === 0;
    next.disabled = position >= total - 1;
    previous.addEventListener('click', function () { go({ q: position - 1 }); });
    next.addEventListener('click', function () { go({ q: position + 1 }); });
    nav.appendChild(previous);
    nav.appendChild(el('span', 'count', 'Question ' + (position + 1) + ' of ' + total));
    nav.appendChild(next);
    return nav;
  }

  /**
   * renderPractice shows one question at a time for the topic.
   * @param {object} topic index entry
   * @param {object} state the current hash state (q = question position)
   * @param {HTMLElement} body container
   */
  function renderPractice(topic, state, body) {
    var questions = topicQuestions(topic);
    if (!questions.length) { body.appendChild(el('div', 'notebox', 'No practice questions for this topic yet.')); return; }
    var position = Math.min(Math.max(state.q, 0), questions.length - 1);
    var question = questions[position];
    var given = answerState[question.slug] || (answerState[question.slug] = { picked: [], nat: '', shown: false });
    function redraw() { body.textContent = ''; drawQuestion(question, given, position, questions.length, body, redraw); }
    redraw();
  }

  /**
   * drawQuestion fills `body` with one question: header, stem, inputs, buttons, reveal.
   * @param {object} question index entry
   * @param {object} given the visitor's state for this question
   * @param {number} position zero-based question number
   * @param {number} total number of questions
   * @param {HTMLElement} body container
   * @param {function} redraw redraws this question
   */
  function drawQuestion(question, given, position, total, body, redraw) {
    var stem = el('div', 'prose');
    stem.innerHTML = renderMarkdown(question.stem);
    var action = el('button', 'chip', given.shown ? 'Try again' : 'Show answer');
    action.addEventListener('click', function () {
      if (given.shown) { given.picked = []; given.nat = ''; }
      given.shown = !given.shown;
      redraw();
    });
    body.appendChild(questionNav(position, total));
    body.appendChild(questionHeader(question));
    body.appendChild(stem);
    body.appendChild(answerInputs(question, given, redraw));
    body.appendChild(el('div', 'qnav')).appendChild(action);
    if (given.shown) body.appendChild(revealBlock(question, given));
  }

  /* ---------- Boot ---------- */

  /**
   * render draws the page for the current hash. It does nothing until data is loaded.
   * Side effects: replaces the contents of the sidebar, toolbar state and content area.
   */
  function render() {
    if (!data) return;
    renderId += 1;
    var state = readHash();
    if (!data.coverage[state.paper]) state.paper = paperCodes()[0];
    renderSidebar(state);
    renderToolbar(state);
    if (state.topic) renderTopic(state, renderId);
    else if (state.view === 'topics') renderTopics(state);
    else renderCoverage(state);
  }

  /**
   * wireControls connects the view buttons, the search box and the hash listener.
   */
  function wireControls() {
    viewToggle.addEventListener('click', function (event) {
      var button = event.target.closest('button');
      if (button) go({ view: button.dataset.view, topic: '', tab: '', q: 0 });
    });
    searchEl.addEventListener('input', function () { searchText = searchEl.value; render(); });
    window.addEventListener('hashchange', render);
  }

  /**
   * boot loads the API and draws the page; on failure it shows the unavailable note.
   * Errors: a failed fetch is caught and reported to the visitor, nothing else on the site is touched.
   */
  function boot() {
    showMessage('Loading GATE library...');
    wireControls();
    loadData().then(function (loaded) {
      data = loaded;
      render();
    }).catch(function () {
      stepsNav.replaceChildren();
      stepsNav.classList.add('hide');
      toolbarEl.classList.add('hide');
      showMessage('GATE library unavailable. Try again later.');
    });
  }

  boot();
})();
