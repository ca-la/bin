import uuid from "node-uuid";

import { test, Test } from "../../test-helpers/simple";
import { isResolveAccountRow, ResolveAccountRow } from "./domain-object";

test("data adapter converts correctly", (t: Test) => {
  const row: ResolveAccountRow = {
    created_at: new Date().toString(),
    deleted_at: null,
    id: uuid.v4(),
    resolve_customer_id: "abc123",
    user_id: uuid.v4(),
  };
  t.true(isResolveAccountRow(row));
});
