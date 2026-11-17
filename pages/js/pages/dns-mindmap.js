/*
 * File purpose: behaviour of dns-mindmap.html - the "Expand all" and
 * "Collapse all" buttons for the branches.
 */
(function () {
  'use strict';

  /**
   * setAllBranches opens or closes every branch of the mind map.
   * @param {boolean} isOpen true to expand all, false to collapse all
   */
  function setAllBranches(isOpen) {
    document.querySelectorAll('details.branch').forEach(function (branch) { branch.open = isOpen; });
  }

  document.getElementById('openAll').addEventListener('click', function () { setAllBranches(true); });
  document.getElementById('closeAll').addEventListener('click', function () { setAllBranches(false); });
})();
