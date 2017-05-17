'use strict';

const sanitizeHtml = require('./index');
const { test } = require('../../test-helpers/fresh');

const ok = Promise.resolve();

test('sanitizeHtml sanitizes HTML', (t) => {
  t.equal(
    sanitizeHtml('<a class="el">hi</a>'),
    '&lt;a class=&quot;el&quot;&gt;hi&lt;/a&gt;'
  );

  return ok;
});
