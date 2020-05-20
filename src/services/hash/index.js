"use strict";

const { promisify } = require("util");
const bcrypt = require("bcrypt");

const BCRYPT_ROUNDS = 10;

/**
 * Create a one-way hash.
 * @param {String} plaintext The string to hash
 * @returns {Promise<String>} Resolves with the hashed string
 */
function hash(plaintext) {
  const genSalt = promisify(bcrypt.genSalt.bind(bcrypt));
  const hashFn = promisify(bcrypt.hash.bind(bcrypt));

  return genSalt(BCRYPT_ROUNDS).then((salt) => hashFn(plaintext, salt));
}

/**
 * Validate whether a string matches a given hash
 * @param {String} plaintext The plaintext to compare
 * @param {String} hash The hash to compare
 * @returns {Promise} Resolves with a Boolean indicating a match
 */
function compare(plaintext, bcryptHash) {
  const compareFn = promisify(bcrypt.compare.bind(bcrypt));
  return compareFn(plaintext, bcryptHash);
}

module.exports = {
  hash,
  compare,
};
