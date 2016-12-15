'use strict';

const db = require('../../services/db');

/**
 * Retrieve an unassigned referral code, then delete it so that nobody else can
 * retrieve it too.
 * @resolves {String}
 */
function get() {
  return db.raw(`
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
