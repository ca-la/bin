'use strict';

const crypto = require('crypto');

// Hash something in an insecure (but unique & fast) manner for stuff like
// checking duplicates. For secure hashes, use bcrypt.
function insecureHash(string) {
  return crypto
    .createHash('sha256')
    .update(string)
    .digest('hex');
}

module.exports = insecureHash;
