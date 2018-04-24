'use strict';

const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first');
const FitPartner = require('../../domain-objects/fit-partner');

const instantiate = data => new FitPartner(data);
const maybeInstantiate = data => (data ? instantiate(data) : null);

const TABLE_NAME = 'fit_partners';

function findById(id) {
  return db(TABLE_NAME)
    .where({ id })
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

module.exports = {
  findById
};
