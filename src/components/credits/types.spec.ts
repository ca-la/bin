import { test } from "../../test-helpers/fresh";
import { Test } from "tape";
import { creditSchema, CreditType, UnvalidatedCredit } from "./types";
import { ZodError, ZodIssue } from "zod";

test("Credits schema", async (t: Test) => {
  const creditBlank: UnvalidatedCredit = {
    id: "c1",
    createdAt: new Date(),
    type: CreditType.PROMO_CODE,
    createdBy: null,
    givenTo: "u1",
    creditDeltaCents: 1,
    description: "u2",
    expiresAt: null,
    financingAccountId: null,
  };
  interface TestCase {
    title: string;
    credit: Partial<UnvalidatedCredit>;
    error?: string;
  }

  const testCases: TestCase[] = [
    {
      title: "Blank",
      credit: {},
    },
    {
      title: "Remove: negative",
      credit: {
        type: CreditType.REMOVE,
        createdBy: "u2",
        creditDeltaCents: -1,
      },
    },
    {
      title: "Remove: positive",
      credit: {
        type: CreditType.REMOVE,
      },
      error: "should be negative for REMOVE type and positive for other types",
    },
    {
      title: "Random 'positive' type with negative value",
      credit: {
        creditDeltaCents: -1,
      },
      error: "should be negative for REMOVE type and positive for other types",
    },
    {
      title: "Manual type with createdBy",
      credit: {
        type: CreditType.MANUAL,
        createdBy: "u2",
      },
    },
    {
      title: "Manual type with no createdBy",
      credit: {
        type: CreditType.MANUAL,
      },
      error:
        "should be set for MANUAL/REMOVE types and should be null for other types",
    },
    {
      title: "Remove type with no createdBy",
      credit: {
        type: CreditType.REMOVE,
      },
      error:
        "should be set for MANUAL/REMOVE types and should be null for other types",
    },
    {
      title: "Not manual/remove type with createdBy",
      credit: {
        createdBy: "u2",
      },
      error:
        "should be set for MANUAL/REMOVE types and should be null for other types",
    },
    {
      title: "Remove type with expiresAt",
      credit: {
        type: CreditType.REMOVE,
        expiresAt: new Date(),
      },
      error: "should be null for REMOVE type transaction",
    },
    {
      title: "Null credit recipient",
      credit: {
        givenTo: null,
        financingAccountId: null,
      },
      error: "exactly one recipient key must be not null",
    },
    {
      title: "More than one not null credit recipient",
      credit: {
        givenTo: "a-user-id",
        financingAccountId: "a-financing-account-id",
      },
      error: "exactly one recipient key must be not null",
    },
  ];

  for (const testCase of testCases) {
    const result = creditSchema.safeParse({
      ...creditBlank,
      ...testCase.credit,
    });
    if (testCase.error !== undefined) {
      const errorFound = (
        (result as { error: ZodError }).error.issues || []
      ).some((issue: ZodIssue) => issue.message === testCase.error);
      t.true(errorFound, testCase.title);
    } else {
      t.equal(result.success, true, testCase.title);
    }
  }
});
