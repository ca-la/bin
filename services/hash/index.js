'use strict';

const bcrypt = require('bcrypt');
const Promise = require('bluebird');

const BCRYPT_ROUNDS = 10;

/**
  * Create a one-way hash.
  * @param {String} plaintext The string to hash
  * @returns {Promise} Resolves with the hashed string
  */
function hash(plaintext) {
  const genSalt = Promise.promisify(bcrypt.genSalt, bcrypt);
  const hashFn = Promise.promisify(bcrypt.hash, bcrypt);

  return genSalt(BCRYPT_ROUNDS)
    .then(salt => hashFn(plaintext, salt));
}

/**
  * Validate whether a string matches a given hash
  * @param {String} plaintext The plaintext to compare
  * @param {String} hash The hash to compare
  * @returns {Promise} Resolves with a Boolean indicating a match
  */
function compare(plaintext, bcryptHash) {
  const compareFn = Promise.promisify(bcrypt.compare, bcrypt);
  return compareFn(plaintext, bcryptHash);
}

module.exports = {
  hash,
  compare
};
