import { test, Test } from "../../test-helpers/fresh";

import serializeRequestBody from "./serialize-request-body";

test("serializeRequestBody serializes flat objects", async (t: Test) => {
  t.equal(
    serializeRequestBody({
      foo: "marks & spencer",
      buz: 123,
      bool: true,
      somethingNully: null,
      somethingUndefinedy: undefined,
    }),
    "foo=marks%20%26%20spencer&buz=123&bool=true&somethingNully=null"
  );
});

test("serializeRequestBody serializes complex objects", async (t: Test) => {
  t.equal(
    serializeRequestBody({
      buz: 123,
      etc: null,
      "records&stuff": [
        {
          "name&stuff": "queue",
          depth: 49,
        },
        {
          more: "yes",
          available: true,
        },
      ],
    }),
    "buz=123&etc=null&records%26stuff[0][name%26stuff]=queue&records%26stuff[0][depth]=49&records%26stuff[1][more]=yes&records%26stuff[1][available]=true"
  );
});
