'use strict';

// Knex configuration. Used by services/db as well as the Knex CLI

let defaultDB;

if (process.env.NODE_ENV === 'test') {
  defaultDB = 'postgres://postgres@data/cala-test';
} else {
  defaultDB = 'postgres://postgres@data/cala';
}

const url = process.env.DATABASE_URL || defaultDB;

module.exports = {
  ssl: true,
  client: 'pg',
  connection: url
};
