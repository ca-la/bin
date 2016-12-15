'use strict';

const db = require('../../services/db');

/**
 * Retrieve an unassigned referral code, then delete it so that nobody else can
 * retrieve it too.
 * @resolves {String}
 */
function get() {
  // This is subject to a race condition, but not as dangerous as doing a
  // `select` and `delete` in two different queries. If two calls are made to
  // this at the same moment, one will fail since it's unable to delete the row.
  // This is arguably better than having both queries return the same referral
  // code, but still needs improvement...
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
