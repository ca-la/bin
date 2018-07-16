'use strict';

// Quick and dirty... best to avoid needing this in the first place by
// not interpolating stuff
const replacements = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

module.exports = function sanitizeHtml(htmlString) {
  return htmlString.replace(/[&<>"']/g, el => replacements[el]);
};
