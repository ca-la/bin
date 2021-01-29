import * as z from "zod";
import { test } from "../../test-helpers/fresh";
import { Test } from "tape";
import { isNullable } from ".";

test("isNullable", async (t: Test) => {
  interface TestCase {
    title: string;
    schema: z.ZodTypeAny;
    result: boolean;
  }

  const testCases: TestCase[] = [
    {
      title: "primitive",
      schema: z.string(),
      result: false,
    },
    {
      title: "nullable()",
      schema: z.string().nullable(),
      result: true,
    },
    {
      title: "union",
      schema: z.union([z.string(), z.number()]),
      result: false,
    },
    {
      title: "nullable union",
      schema: z.union([z.string(), z.null(), z.number()]),
      result: true,
    },
  ];

  for (const testCase of testCases) {
    t.is(isNullable(testCase.schema), testCase.result, testCase.title);
  }
});
