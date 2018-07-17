'use strict';

const fs = require('fs');
const uniq = require('lodash/uniq');

const db = require('../services/db');
const Logger = require('../services/logger');

/**
 * Usage:
 *   node scripts/generate-referral-codes.js > codes.txt
 *
 *   ... go add these codes to shopify, then ...
 *
 *   node scripts/insert-referral-codes.js
 *
 * TODO make this much more flexible
 */

const codes = fs.readFileSync('codes.txt', 'utf-8')
  .split('\n')
  .map(code => code.trim())
  .filter(Boolean);

const data = uniq(codes).map((code) => { return { code }; });

return db('unassigned_referral_codes').insert(data)
  .then(() => {
    Logger.log(`Inserted ${data.length} new codes`);
    process.exit(0);
  });
