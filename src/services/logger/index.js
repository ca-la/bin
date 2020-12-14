"use strict";

const COLORS = require("../colors");

function log(...args) {
  // eslint-disable-next-line no-console
  console.log(
    COLORS.blue,
    `[LOG] ${new Date().getTime()}:`,
    ...args,
    COLORS.reset
  );
}

function time(label) {
  // eslint-disable-next-line no-console
  console.time(label);
}

function timeEnd(label) {
  // eslint-disable-next-line no-console
  console.timeEnd(label);
}

function timeLog(label, ...args) {
  // eslint-disable-next-line no-console
  console.timeLog(label, ...args);
}

function logServerError(...args) {
  // eslint-disable-next-line no-console
  console.log(COLORS.red, "SERVER ERROR:", ...args, COLORS.reset);
}

function logClientError(...args) {
  // eslint-disable-next-line no-console
  console.log(COLORS.red, "CLIENT ERROR:", ...args, COLORS.reset);
}

function logWarning(...args) {
  // eslint-disable-next-line no-console
  console.log(COLORS.yellow, "WARNING:", ...args, COLORS.reset);
}

function table(...args) {
  // eslint-disable-next-line no-console
  console.table(...args);
}

module.exports = {
  log,
  logServerError,
  logWarning,
  logClientError,
  time,
  timeEnd,
  timeLog,
  table,
};
