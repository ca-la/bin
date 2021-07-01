import { sliceAroundIndex } from ".";
import { test, Test } from "../../test-helpers/fresh";

test("sliceAroundIndex - slice limit does not exceed array's length", async (t: Test) => {
  const array = [0, 1, 2, 3, 4];
  const sliced = sliceAroundIndex({ array, index: 2, limit: 10 });
  t.deepEqual(sliced, array);
});

test("sliceAroundIndex - slice does not exceed array's length", async (t: Test) => {
  const array = [0, 1, 2, 3, 4];
  const sliced1 = sliceAroundIndex({ array, index: 2, limit: 3 });
  t.deepEqual(sliced1, [1, 2, 3]);

  const sliced2 = sliceAroundIndex({ array, index: 2, limit: 4 });
  t.deepEqual(sliced2, [0, 1, 2, 3]);

  const sliced3 = sliceAroundIndex({ array, index: 2, limit: 2 });
  t.deepEqual(sliced3, [1, 2]);
});

test("sliceAroundIndex - slice exceeds array's start", async (t: Test) => {
  const array = [0, 1, 2, 3, 4, 5, 6];
  const sliced1 = sliceAroundIndex({ array, index: 1, limit: 5 });
  t.deepEqual(sliced1, [0, 1, 2, 3, 4]);

  const sliced2 = sliceAroundIndex({ array, index: 1, limit: 4 });
  t.deepEqual(sliced2, [0, 1, 2, 3]);
});

test("sliceAroundIndex - slice exceeds array's end", async (t: Test) => {
  const array = [0, 1, 2, 3, 4, 5, 6];
  const sliced1 = sliceAroundIndex({ array, index: 5, limit: 5 });
  t.deepEqual(sliced1, [2, 3, 4, 5, 6]);

  const sliced2 = sliceAroundIndex({ array, index: 5, limit: 4 });
  t.deepEqual(sliced2, [3, 4, 5, 6]);
});
