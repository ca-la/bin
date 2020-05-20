import * as qs from "querystring";
import { test, Test } from "../../test-helpers/simple";
import { addJson } from "./index";

test("addJson", async (t: Test) => {
  const testUser = { user: { name: "A Test User" }, page: 1 };
  t.equal(
    addJson("userInfo", testUser),
    "userInfo=%257B%2522user%2522%253A%257B%2522name%2522%253A%2522A%2520Test%2520User%2522%257D%252C%2522page%2522%253A1%257D"
  );

  t.deepEqual(
    JSON.parse(
      qs.unescape(qs.parse(addJson("userInfo", testUser)).userInfo as string)
    ),
    testUser,
    "Round trip encoding/decoding preserves JSON equivalence"
  );
});
