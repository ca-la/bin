'use strict';

const uuid = require('node-uuid').v4;
const sample = require('lodash/samplesize');

const alphabet = 'QWERTYUPASDFGHJKLZXCVBNM23456789'.split('')

const prefix = 'X';

for (var i = 0; i < 10000; i++) {
  console.log(prefix + sample(alphabet, 5).join(''));
}
