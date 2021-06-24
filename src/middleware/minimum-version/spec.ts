import { test, Test } from "../../test-helpers/fresh";
import { get } from "../../test-helpers/http";

test("minimumVersion middleware allows valid versions", async (t: Test) => {
  const [r1] = await get("/", {
    headers: {
      "x-cala-app": "studio@1.23.4",
    },
  });
  t.equal(r1.status, 200);

  const [r2] = await get("/", {
    headers: {
      "x-cala-app": "pegasus-ios@1.23.4 (4567)",
    },
  });
  t.equal(r2.status, 200);

  const [r3] = await get("/", {
    headers: {
      "x-cala-app": "",
    },
  });
  t.equal(r3.status, 200);

  const [r4] = await get("/", {
    headers: {
      "x-cala-app": "pizza hut",
    },
  });
  t.equal(r4.status, 200);

  const [r5] = await get("/", {
    headers: {
      "x-cala-app": "skunkworks@0.0.0",
    },
  });

  t.equal(r5.status, 200);
});

test("minimumVersion middleware disallows invalid versions", async (t: Test) => {
  const [r1] = await get("/", {
    headers: {
      "x-cala-app": "studio@0.0.0",
    },
  });

  t.equal(r1.status, 412);

  const [r2] = await get("/", {
    headers: {
      "x-cala-app": "pegasus-ios@1.23.4 (0)",
    },
  });

  t.equal(r2.status, 412);
});
