"use strict";

/**
 * @returns {String} yyyy-mm-dd
 */
function formatDateString(date) {
  const paddedYear = `0000${date.getUTCFullYear()}`.slice(-4);
  const paddedMonth = `00${date.getUTCMonth() + 1}`.slice(-2);
  const paddedDay = `00${date.getUTCDate()}`.slice(-2);

  return [paddedYear, paddedMonth, paddedDay].join("-");
}

module.exports = formatDateString;
