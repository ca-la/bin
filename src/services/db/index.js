"use strict";

const { PerformanceObserver, performance } = require("perf_hooks");
const knex = require("knex");

const knexConfig = require("../../knexfile");
const Logger = require("../../services/logger");
const {
  LOG_ALL_QUERIES,
  LOG_NON_TRANSACTION_QUERIES,
  LOG_DATABASE_TIMING,
} = require("../../config");
const Analytics = require("../../services/analytics");

const obs = new PerformanceObserver((items) => {
  for (const { name, duration } of items.getEntries()) {
    Analytics.trackMetric(name.replace(/:.*$/, ""), duration);
    if (LOG_DATABASE_TIMING) {
      Logger.log(`${name}: ${duration}`);
    }
  }
});
obs.observe({ entryTypes: ["measure"], buffered: true });

const db = knex(knexConfig);

db.client.pool.on("poolDestroyRequest", () => {
  performance.clearMarks();
  performance.clearMeasures();
  obs.disconnect();
});

db.client.pool.on("acquireRequest", (eventId) => {
  performance.mark(`${eventId} acquireRequest`);
});

db.client.pool.on("acquireFail", (eventId, error) => {
  Logger.logWarning(`${eventId} Connection acquisition failed with`, error);
  performance.mark(`${eventId} acquireFail`);
  performance.measure(
    `Connection acquisition timing: ${eventId}`,
    `${eventId} acquireRequest`,
    `${eventId} acquireFail`
  );
});

db.client.pool.on("acquireSuccess", (eventId, connection) => {
  performance.mark(`${connection.__knexUid} acquireSuccess`);
  performance.measure(
    `Connection acquisition timing: ${eventId}`,
    `${eventId} acquireRequest`,
    `${connection.__knexUid} acquireSuccess`
  );
});

db.client.pool.on("release", (connection) => {
  performance.mark(`${connection.__knexUid} release`);
  performance.measure(
    `Connection lifetime: ${connection.__knexUid}`,
    `${connection.__knexUid} acquireSuccess`,
    `${connection.__knexUid} release`
  );
});

if (LOG_ALL_QUERIES) {
  db.on("query", (data) => {
    if (data.__knexQueryUid) {
      Logger.time(`Query Timing: ${data.__knexQueryUid}`);
    }

    if (!data.__knexTxId) {
      Logger.logWarning(
        `Query ${data.__knexQueryUid} outside of explicit transaction`
      );
    }
    Logger.log(
      `Query ${data.__knexQueryUid}: \`${data.sql}\` Bindings: ${data.bindings}`
    );
  });

  db.on("query-response", (_response, obj) => {
    if (obj.__knexQueryUid) {
      Logger.timeEnd(`Query Timing: ${obj.__knexQueryUid}`);
    }
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
