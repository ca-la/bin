'use strict';

const db = require('../../services/db');

/**
 * Retrieve an unassigned referral code, then delete it so that nobody else can
 * retrieve it too. Locks the table while in progress to avoid race conditions
 * regarding pulling the top referral code off the stack.
 *
 * @resolves {String}
 */
function get() {
  return db.raw(`
lock table unassigned_referral_codes in exclusive mode;
delete from unassigned_referral_codes
  where code in (select code from unassigned_referral_codes limit 1)
  returning *;
`)
    .then((response) => {
      const { rows } = response;

      if (rows.length < 1) {
        throw new Error('No more unused referral codes found! Create more in Shopify then add them to the database!');
      }

      return rows[0].code;
    });
}

module.exports = {
  get
};
