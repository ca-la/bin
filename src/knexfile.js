'use strict';

// Knex configuration. Used by services/db as well as the Knex CLI

const connection = process.env.DATABASE_URL;

if (!connection) {
  throw new Error('Missing DATABASE_URL config value');
}

module.exports = {
  ssl: true,
  client: 'pg',
  connection,
  pool: {
    min: 2,
    // The maximum number of connections we could safely use is roughly
    // [number of allowed connections for our database plan] divided by [number
    // of live API hosts], divided by 2 to account for rolling deployments.
    //
    // As of 2019-01-15 we're on the standard-0 plan (120 connections) and have
    // 2 API hosts, so the safe cap is ~30. Subtracting a few more to account
    // for one-off script runs and connections.
    max: 25
  }
};
