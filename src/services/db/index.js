"use strict";

const knex = require("knex");
const knexConfig = require("../../knexfile");
const Logger = require("../../services/logger");
const { LOG_ALL_QUERIES } = require("../../config");

const db = knex(knexConfig);

if (LOG_ALL_QUERIES) {
  db.on("query", (data) => {
    Logger.log(`Query: \`${data.sql}\` Bindings: ${data.bindings}`);
  });
}

module.exports = db;
