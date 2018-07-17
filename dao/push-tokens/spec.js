'use strict';

const PushTokensDAO = require('./index');
const { test } = require('../../test-helpers/fresh');
const createUser = require('../../test-helpers/create-user');

test('PushTokensDAO.create creates a new token', (t) => {
  let userId;

  return createUser({ withSesssion: false })
    .then(({ user }) => {
      userId = user.id;
      return PushTokensDAO.create({
        anonymousId: 'abc123',
        userId: user.id,
        apnsDeviceToken: '123-123'
      });
    })
    .then((token) => {
      t.equal(token.anonymousId, 'abc123');
      t.equal(token.userId, userId);
      t.equal(token.apnsDeviceToken, '123-123');
    });
});

test('PushTokensDAO.addAlias adds a user id to an anonymous id', (t) => {
  let userId;
  return createUser({ withSesssion: false })
    .then(({ user }) => {
      userId = user.id;

      return PushTokensDAO.create({
        anonymousId: 'abc123',
        userId: null,
        apnsDeviceToken: '123-123'
      });
    })
    .then(() => {
      return PushTokensDAO.addAlias('abc123', userId);
    })
    .then((updatedTokens) => {
      t.equal(updatedTokens.length, 1);

      const token = updatedTokens[0];
      t.equal(token.anonymousId, 'abc123');
      t.equal(token.userId, userId);
      t.equal(token.apnsDeviceToken, '123-123');
    });
});
