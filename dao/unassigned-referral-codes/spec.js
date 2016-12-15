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

test('UnassignedReferralCodesDAO.get returns unique codes in series', (t) => {
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

test('UnassignedReferralCodesDAO.get returns unique codes in parallel', (t) => {
  return db('unassigned_referral_codes')
    .insert([
      { code: 'ABC1' },
      { code: 'ABC2' },
      { code: 'ABC3' },
      { code: 'ABC4' }
    ])
    .then(() => {
      return Promise.all([
        UnassignedReferralCodesDAO.get(),
        UnassignedReferralCodesDAO.get(),
        UnassignedReferralCodesDAO.get(),
        UnassignedReferralCodesDAO.get()
      ]);
    })
    .then((codes) => {
      t.deepEqual(codes.sort(), ['ABC1', 'ABC2', 'ABC3', 'ABC4']);
    });
});
