'use strict';

const UnassignedReferralCodesDAO = require('./index');
const { test } = require('../../test-helpers/fresh');
const db = require('../../services/db');

test('UnassignedReferralCodesDAO.get throws an error if no entropy remains', (t) => {
  t.plan(1);

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
      return Promise.resolve();
    }).then(() => {
      console.log('4 inserted');
      return Promise.resolve(UnassignedReferralCodesDAO.get());
    }).then((codes) => {
      return Promise.resolve(UnassignedReferralCodesDAO.get());
    })
    .then((code) => {
      t.notEqual(code, code1);
    });
});
