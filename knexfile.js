'use strict';

// Knex configuration. Used by services/db as well as the Knex CLI

let defaultDB;

if (process.env.NODE_ENV === 'test') {
  defaultDB = 'postgres://localhost/cala-test';
} else {
  defaultDB = 'postgres://localhost/cala';
}

module.exports = {
  ssl: true,
  client: 'pg',
  connection: process.env.DATABASE_URL || defaultDB
};
