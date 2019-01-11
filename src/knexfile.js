'use strict';

// Knex configuration. Used by services/db as well as the Knex CLI

const connection = process.env.DATABASE_URL;

if (!connection) {
  throw new Error('Missing DATABASE_URL config value');
}

module.exports = {
  ssl: true,
  client: 'pg',
  connection
};
