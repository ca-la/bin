import { test, Test } from "../../test-helpers/fresh";

import sequenceIncrement, { getCurrentValue } from "./index";

test("retrieveIncrement retrieves an increment sequentially", async (t: Test) => {
  const increment = await sequenceIncrement("short_id_increment");
  const increment2 = await sequenceIncrement("short_id_increment");
  const increment3 = await sequenceIncrement("short_id_increment");

  t.true(
    increment2 > increment,
    "The second increment is larger than the first."
  );
  t.true(increment3 > increment2, "The third is larger than the second.");
});

test("getCurrentValue", async (t: Test) => {
  await sequenceIncrement("sku_increment");
  const value = await getCurrentValue("sku_increment");

  t.true(!Number.isNaN(value), "returned number is valid");

  try {
    await getCurrentValue("unknown_sequence");
    t.fail("doesn't throw on unknown sequence");
  } catch (err) {
    t.equal(
      err.message,
      'SELECT currval($1); - relation "unknown_sequence" does not exist',
      "throws on unknown sequence"
    );
  }
});
