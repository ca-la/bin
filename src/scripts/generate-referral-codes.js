'use strict';

const sample = require('lodash/sampleSize');

const alphabet = 'QWERTYUPASDFGHJKLZXCVBNM23456789'.split('');

const prefix = 'X';

for (let i = 0; i < 10000; i += 1) {
  // eslint-disable-next-line no-console
  console.log(prefix + sample(alphabet, 5).join(''));
}
