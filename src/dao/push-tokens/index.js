'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first').default;
const PushToken = require('../../domain-objects/push-token');

const instantiate = data => new PushToken(data);

function create(data) {
  return db('pushtokens')
    .insert({
      id: uuid.v4(),
      user_id: data.userId,
      anonymous_id: data.anonymousId,
      apns_device_token: data.apnsDeviceToken
    }, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function addAlias(anonymousId, userId) {
  return db('pushtokens')
    .where({
      anonymous_id: anonymousId
    })
    .update({
      user_id: userId
    }, '*')
    .catch(rethrow)
    .then(tokens => tokens.map(instantiate));
}

module.exports = {
  create,
  addAlias
};
