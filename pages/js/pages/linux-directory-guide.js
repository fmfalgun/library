/*
 * File purpose: behaviour of linux-directory-guide.html - builds the sidebar
 * and the section lists from Library.data, shows one section at a time (chosen
 * by the URL hash) and filters rows by the search box.
 */
(function () {
  'use strict';

  var esc = Library.esc;
  var sections = Library.data.sections;
  var virtualMark = Library.data.virtualMark;
  var out = document.getElementById('out');
  var nav = document.getElementById('nav');
  var overview = document.getElementById('overview');
  var searchBox = document.getElementById('q');

  /**
   * rowHTML renders one [path, description, virtual] row.
   * @param {Array} row path, description and an optional virtual marker
   * @param {object} section the section the row belongs to ("virt" marks all its rows)
   * @returns {string} HTML for one list row
   */
  function rowHTML(row, section) {
    var isVirtual = row[2] === virtualMark || section.id === 'virt';
    var mark = isVirtual ? '<span class="pill amber">virtual</span>' : '';
    return '<div class="list-row"><code>' + esc(row[0]) + '</code><span>' + esc(row[1]) + mark + '</span></div>';
  }

  /**
   * groupHTML renders one titled group of rows.
   * @param {Array} group [title, rows]
   * @param {object} section the section the group belongs to
   * @returns {string} HTML for the group
   */
  function groupHTML(group, section) {
    var rows = group[1].map(function (row) { return rowHTML(row, section); }).join('');
    return '<div class="group"><p class="subhead">' + esc(group[0]) + '<span class="line"></span></p><div class="list">' + rows + '</div></div>';
  }

  /**
   * sectionHTML renders one whole section: title, lead sentence and groups.
   * @param {object} section {id, t: title, l: lead, g: groups}
   * @returns {string} HTML for the section
   */
  function sectionHTML(section) {
    var groups = section.g.map(function (group) { return groupHTML(group, section); }).join('');
    return '<section id="' + section.id + '"><h2 class="section-title">' + esc(section.t) + '</h2><p class="lead">' + esc(section.l) + '</p>' + groups + '</section>';
  }

  /**
   * addNavLink appends one sidebar link.
   * @param {string} id the section id the link points to
   * @param {string} label the link text
   */
  function addNavLink(id, label) {
    var link = Library.el('a', 'step-btn', label);
    link.href = '#' + id;
    nav.appendChild(link);
  }

  /** build fills the sidebar and the content area from the data. */
  function build() {
    nav.appendChild(Library.el('div', 'navlabel', 'SECTIONS'));
    addNavLink('overview', 'Overview');
    sections.forEach(function (section) { addNavLink(section.id, section.t); });
    out.innerHTML = sections.map(sectionHTML).join('');
  }

  /**
   * view shows the section named by the URL hash (or the overview) and hides
   * rows, groups and sections that do not match the search text. While a
   * search is active, every section with a match is shown.
   */
  function view() {
    var id = (location.hash || '#overview').slice(1);
    var query = searchBox.value.toLowerCase().trim();
    overview.classList.toggle('hide', !!query || id !== 'overview');
    nav.querySelectorAll('a').forEach(function (link) { link.classList.toggle('active', link.getAttribute('href') === '#' + id); });
    document.querySelectorAll('.list-row').forEach(function (row) { row.classList.toggle('hide', query && row.textContent.toLowerCase().indexOf(query) < 0); });
    document.querySelectorAll('.group').forEach(function (group) { group.classList.toggle('hide', !group.querySelector('.list-row:not(.hide)')); });
    document.querySelectorAll('section').forEach(function (section) {
      section.classList.toggle('hide', query ? !section.querySelector('.list-row:not(.hide)') : section.id !== id);
    });
  }

  build();
  view();
  addEventListener('hashchange', function () { view(); scrollTo(0, 0); });
  searchBox.addEventListener('input', view);
})();
