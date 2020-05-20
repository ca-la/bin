import { test, Test } from "../../test-helpers/simple";
import addMargin from "./index";

test("addMargin", (t: Test) => {
  t.equal(addMargin(100, 0.06), 107);
  t.throws(() => addMargin(1000, 1));
  t.throws(() => addMargin(1000, 1.2));
});
