"use strict";

const { DATABASE_URL, MAX_DB_CONNECTION_POOL_SIZE } = require("./config");

// Knex configuration. Used by services/db as well as the Knex CLI
module.exports = {
  ssl: true,
  client: "pg",
  connection: DATABASE_URL,
  pool: {
    min: 2,

    // The maximum number of connections we could safely use is approximately
    // "(allowedConnections - scriptConnections) / hostCount / 2", where:
    //  - `allowedConnections` is the number of allowed connections for our
    //     database plan, e.g. 120 for heroku's "standard-0"
    //  - `scriptConnections` is a fixed overhead for scripts, migrations, other
    //    one-off connections, e.g. 20
    //  - `hostCount` is the number of deployed application servers running
    //  - dividing by 2 accounts for rolling deployments
    //
    // So, on a deployment with 2 app hosts and 120 allowed connections, that
    // puts us at roughly (120-20)/2/2 ~= 25
    max: MAX_DB_CONNECTION_POOL_SIZE,
  },
};
