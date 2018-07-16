'use strict';

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  fmt: {}
};

Object.keys(COLORS).forEach((color) => {
  COLORS.fmt[color] = str =>
    `${COLORS[color]}${str}${COLORS.reset}`;
});

module.exports = COLORS;
