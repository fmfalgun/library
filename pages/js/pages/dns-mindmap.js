/*
 * File purpose: behaviour of dns-mindmap.html - builds the sidebar from the
 * page's sections, highlights the section being read, and filters cards by
 * the search box.
 */
(function () {
  'use strict';

  var nav = document.getElementById('nav');
  var searchBox = document.getElementById('q');
  var empty = document.getElementById('empty');
  var sections = Array.prototype.slice.call(document.querySelectorAll('main section'));

  /** buildNav fills the sidebar with one link per section, titled like its heading. */
  function buildNav() {
    nav.appendChild(Library.el('div', 'navlabel', 'BRANCHES'));
    sections.forEach(function (section) {
      var link = Library.el('a', 'step-btn', section.querySelector('h2').textContent);
      link.href = '#' + section.id;
      nav.appendChild(link);
    });
  }

  /**
   * markActive highlights the sidebar link of the section id given.
   * @param {string} id the section id to mark, or '' to clear all marks
   */
  function markActive(id) {
    nav.querySelectorAll('a').forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('href') === '#' + id);
    });
  }

  /**
   * filterCards hides cards that do not contain the search text, then hides
   * sections left with no card, and shows a note when nothing matches.
   */
  function filterCards() {
    var query = searchBox.value.toLowerCase().trim();
    var anyShown = false;
    sections.forEach(function (section) {
      var shown = 0;
      section.querySelectorAll('.card').forEach(function (card) {
        var isMatch = !query || card.textContent.toLowerCase().indexOf(query) >= 0;
        card.classList.toggle('hide', !isMatch);
        if (isMatch) shown += 1;
      });
      section.classList.toggle('hide', shown === 0);
      if (shown > 0) anyShown = true;
    });
    empty.style.display = anyShown ? 'none' : 'block';
  }

  /** watchScroll marks the sidebar link of the section nearest the top while scrolling. */
  function watchScroll() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) markActive(entry.target.id); });
    }, { rootMargin: '-10% 0px -80% 0px' });
    sections.forEach(function (section) { observer.observe(section); });
  }

  buildNav();
  markActive(sections[0].id);
  watchScroll();
  searchBox.addEventListener('input', filterCards);
})();
