'use strict';

const uuid = require('node-uuid');
const Promise = require('bluebird');

const db = require('../../services/db');
const first = require('../../services/first');
const InvalidDataError = require('../../errors/invalid-data');
const Session = require('../../domain-objects/session');
const Shopify = require('../../services/shopify');
const UsersDAO = require('../users');
const { compare } = require('../../services/hash');

const instantiate = data => new Session(data);

function createUserFromShopify(email, password) {
  return Shopify.login(email, password)
    .then(() => {
      return UsersDAO.create({
        email,
        name: email,
        password,
        zip: '00000'
      });
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.log('Shopify login error:', err.stack);
      return null;
    });
}

function create(data) {
  const { email, password } = data;

  if (!email || !password) {
    return Promise.reject(new InvalidDataError('Missing required information'));
  }

  let user;

  return UsersDAO.findByEmail(email)
    .then((_user) => {
      if (!_user) {
        return createUserFromShopify(email, password);
      }

      return _user;
    })
    .then((_user) => {
      user = _user;

      if (!user) {
        throw new InvalidDataError('No matching user found');
      }
      return compare(password, user.passwordHash);
    })
    .then((match) => {
      if (!match) {
        throw new InvalidDataError('Incorrect password');
      }

      return db('sessions').insert({
        id: uuid.v4(),
        user_id: user.id
      }, '*');
    })
    .then(first)
    .then(instantiate)
    .then((session) => {
      session.setUser(user);
      return session;
    });
}

module.exports = {
  create
};
