import DataAdapter from "../../services/data-adapter";
import { test, Test } from "../../test-helpers/simple";

import { validate, validateEvery } from "./index";

interface Product {
  id: string;
}

interface ProductRow {
  id: string;
}

class MyCustomError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = "MyCustomError";
  }
}

function isProductRow(a: any): a is ProductRow {
  let isValid = false;
  try {
    isValid = typeof a.id === "string";
  } catch (e) {
    throw new MyCustomError("Oh no!");
  }
  return isValid;
}

const productAdapter = new DataAdapter<ProductRow, Product>();
const table = "products";

test("#validate, with valid data", (t: Test) => {
  const row: ProductRow = {
    id: "aProduct",
  };

  t.doesNotThrow(() => validate(table, isProductRow, productAdapter, row));
});

test("#validate, with invalid data", (t: Test) => {
  const invalid = ({
    id: 42,
  } as any) as ProductRow;

  t.throws(() => validate(table, isProductRow, productAdapter, invalid), Error);
});

test("#validate, with null", (t: Test) => {
  t.throws(
    () => validate(table, isProductRow, productAdapter, null),
    MyCustomError
  );
});

test("#validate, with undefined", (t: Test) => {
  t.throws(
    () => validate(table, isProductRow, productAdapter, undefined),
    MyCustomError
  );
});

test("#validateEvery, with valid data", (t: Test) => {
  const row: ProductRow = {
    id: "aProduct",
  };

  t.doesNotThrow(() =>
    validateEvery(table, isProductRow, productAdapter, [row])
  );
});

test("#validateEvery, with invalid data", (t: Test) => {
  const invalid = ({
    id: 42,
  } as any) as ProductRow;

  t.throws(
    () => validateEvery(table, isProductRow, productAdapter, [invalid]),
    Error
  );
});

test("#validateEvery, with null", (t: Test) => {
  t.throws(
    () => validateEvery(table, isProductRow, productAdapter, null),
    Error
  );
});

test("#validateEvery, with undefined", (t: Test) => {
  t.throws(() => validateEvery(table, isProductRow, productAdapter, undefined));
});

test("#validateEvery, with a mixed array", (t: Test) => {
  const row: ProductRow = {
    id: "aProduct",
  };

  const invalid = ({
    id: 42,
  } as any) as ProductRow;

  t.throws(
    () =>
      validateEvery(table, isProductRow, productAdapter, [
        invalid,
        row,
        null,
        undefined,
      ]),
    Error,
    "throws with first error"
  );
  t.throws(
    () =>
      validateEvery(table, isProductRow, productAdapter, [
        null,
        invalid,
        row,
        undefined,
      ]),
    MyCustomError,
    "throws with first error"
  );
});
