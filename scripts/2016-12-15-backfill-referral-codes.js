'use strict';

const UnassignedReferralCodesDAO = require('../dao/unassigned-referral-codes');
const db = require('../services/db');
const Logger = require('../services/logger');

function setUserCode(userId) {
  return UnassignedReferralCodesDAO.get().then((code) => {
    return db('users')
      .where({ id: userId })
      .update({ referral_code: code }, '*');
  });
}

return db('users').where({ referral_code: null })
  .then((users) => {
    Logger.log(`Found ${users.length} users without referral codes`);
    return Promise.all(users.map(user => setUserCode(user.id)));
  })
  .then((updatedUsers) => {
    Logger.log(`Updated ${updatedUsers.length} users`);

    process.exit(0);
  });
