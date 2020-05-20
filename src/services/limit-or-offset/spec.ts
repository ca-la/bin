import sinon from "sinon";

import { test, Test } from "../../test-helpers/simple";
import limitOrOffset from ".";

test("limitOrOffset adds limit to query", async (t: Test) => {
  const limitSpy = sinon.spy();
  const offsetSpy = sinon.spy();

  const mockQuery = { limit: limitSpy, offset: offsetSpy } as any;

  limitOrOffset(1)(mockQuery);
  t.equal(limitSpy.callCount, 1, "Limit is called once");
  t.equal(offsetSpy.callCount, 0, "Offset is not called");
});

test("limitOrOffset adds offset to query", async (t: Test) => {
  const limitSpy = sinon.spy();
  const offsetSpy = sinon.spy();

  const mockQuery = { limit: limitSpy, offset: offsetSpy } as any;

  limitOrOffset(undefined, 1)(mockQuery);
  t.equal(limitSpy.callCount, 0, "Limit is called once");
  t.equal(offsetSpy.callCount, 1, "Offset is not called");
});

test("limitOrOffset adds limit and offset to query", async (t: Test) => {
  const limitSpy = sinon.spy();
  const offsetSpy = sinon.spy();

  const mockQuery = { limit: limitSpy, offset: offsetSpy } as any;

  limitOrOffset(1, 1)(mockQuery);
  t.equal(limitSpy.callCount, 1, "Limit is called once");
  t.equal(offsetSpy.callCount, 1, "Offset is called once");
});
