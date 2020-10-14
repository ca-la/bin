"use strict";

const knex = require("knex");
const knexConfig = require("../../knexfile");
const Logger = require("../../services/logger");
const {
  LOG_ALL_QUERIES,
  LOG_NON_TRANSACTION_QUERIES,
} = require("../../config");

const db = knex(knexConfig);

if (LOG_ALL_QUERIES) {
  db.on("query", (data) => {
    Logger.time(data.__knexQueryUid);
    Logger.log(
      `Query ${data.__knexQueryUid}: \`${data.sql}\` Bindings: ${data.bindings}`
    );
  }).on("query-response", (_response, obj) => {
    Logger.timeEnd(obj.__knexQueryUid);
  });
}

if (LOG_NON_TRANSACTION_QUERIES) {
  db.on("query", (data) => {
    if (!data.__knexTxId) {
      Logger.log(
        `Non-Transacted: Query: \`${data.sql}\` Bindings: ${data.bindings}`
      );
    }
  });
}

module.exports = db;
