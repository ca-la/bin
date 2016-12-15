'use strict';

const UnassignedReferralCodesDAO = require('./index');
const { test } = require('../../test-helpers/fresh');
const db = require('../../services/db');

test('UnassignedReferralCodesDAO.get throws an error if no entropy remains', (t) => {
  return UnassignedReferralCodesDAO.get()
    .catch((err) => {
      t.equal(err.message, 'No more unused referral codes found! Create more in Shopify then add them to the database!');
    });
});

test('UnassignedReferralCodesDAO.get returns codes', (t) => {
  let code1;

  return db('unassigned_referral_codes')
    .insert([
      { code: 'ABC1' },
      { code: 'ABC2' },
      { code: 'ABC3' },
      { code: 'ABC4' }
    ])
    .then(() => {
      return UnassignedReferralCodesDAO.get();
    }).then((code) => {
      code1 = code;
      return UnassignedReferralCodesDAO.get();
    })
    .then((code) => {
      t.notEqual(code, code1);
    });
});
