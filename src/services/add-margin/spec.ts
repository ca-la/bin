import { test, Test } from "../../test-helpers/simple";
import addMargin, { calculateBasisPoints } from "./index";

test("addMargin", (t: Test) => {
  t.equal(addMargin(100, 0.06), 107);
  t.throws(() => addMargin(1000, 1));
  t.throws(() => addMargin(1000, 1.2));
});

test("calculateBasisPoints", (t: Test) => {
  t.equal(
    calculateBasisPoints(10000, 200),
    200,
    "converts 100 dollars to 2 dollars with 200 basis points"
  );
  t.equal(
    calculateBasisPoints(100, 50),
    1,
    "converts 100 cents to 1 cent with 50 basis points"
  );
  t.equal(
    calculateBasisPoints(10000, 5),
    5,
    "converts 100 dollars to 5 cents with 5 basis points"
  );
  t.equal(
    calculateBasisPoints(1000, 5),
    1,
    "converts 10 dollars to 1 cent with 5 basis points"
  );
});
