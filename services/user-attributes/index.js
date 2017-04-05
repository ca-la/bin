'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const UsersDAO = require('../../dao/users');
const { updateUser } = require('../mailchimp');

function recordScan(userId) {
  return UsersDAO.findById(userId)
    .then((user) => {
      if (!user) {
        throw new InvalidDataError(`User not found: ${userId}`);
      }

      return updateUser({
        email: user.email,
        hasScan: true
      });
    });
}

function recordPurchase(userId) {
  return UsersDAO.findById(userId)
    .then((user) => {
      if (!user) {
        throw new InvalidDataError(`User not found: ${userId}`);
      }

      return updateUser({
        email: user.email,
        hasBought: true
      });
    });
}

module.exports = {
  recordScan,
  recordPurchase
};
