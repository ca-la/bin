"use strict";

const sanitizeHtml = require("./index");
const { test } = require("../../test-helpers/simple");

test("sanitizeHtml sanitizes HTML", async (t) => {
  t.equal(
    sanitizeHtml('<a class="el">hi</a>'),
    "&lt;a class=&quot;el&quot;&gt;hi&lt;/a&gt;"
  );
});
