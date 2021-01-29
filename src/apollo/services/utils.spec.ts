import { test, Test } from "../../test-helpers/fresh";
import { extractSortedTypes, buildTypes } from "./utils";
import { GraphQLType, TypesContainer } from "../types";

test("extractSortedTypes", async (t: Test) => {
  const typeBlank: Pick<GraphQLType, "type" | "body"> = {
    type: "type",
    body: {},
  };
  interface TestCase {
    title: string;
    types: Pick<GraphQLType, "name" | "requires">[];
    result?: string[];
    error?: string;
  }
  const testCases: TestCase[] = [
    {
      title: "No deps",
      types: [{ name: "T1" }, { name: "T2" }, { name: "T3" }, { name: "T4" }],
      result: ["T1", "T2", "T3", "T4"],
    },
    {
      title: "Nested deps",
      types: [
        { name: "T1", requires: ["T2", "T3"] },
        { name: "T2", requires: ["T3"] },
        { name: "T3", requires: ["T4"] },
        { name: "T4" },
      ],
      result: ["T4", "T3", "T2", "T1"],
    },
    {
      title: "Missing dep",
      types: [{ name: "T1", requires: ["T2"] }],
      error:
        'Could not resolve dependencies for GraphQL type "T1". The missing dependencies are: T2',
    },
    {
      title: "Circular dep",
      types: [
        { name: "T1", requires: ["T2"] },
        { name: "T2", requires: ["T3"] },
        { name: "T3", requires: ["T1"] },
      ],
      error:
        'Could not resolve dependencies for GraphQL type "T1". The missing dependencies are: T2',
    },
  ];

  for (const testCase of testCases) {
    const typeContainers: TypesContainer[] = testCase.types.map(
      (type: TestCase["types"][number]): TypesContainer => ({
        types: [{ ...type, ...typeBlank } as GraphQLType],
      })
    );
    try {
      const result = extractSortedTypes(typeContainers).map(
        (type: GraphQLType) => type.name
      );
      if (testCase.result) {
        t.deepEqual(result, testCase.result, testCase.title);
      } else {
        t.fail(testCase.title);
      }
    } catch (err) {
      if (testCase.error) {
        t.is(err.message, testCase.error, testCase.title);
      } else {
        t.notOk(err, testCase.title);
      }
    }
  }
});

test("buildTypes", async (t: Test) => {
  const types: GraphQLType[] = [
    {
      name: "T1",
      type: "type",
      body: { b1: "Int" },
    },
    {
      name: "E2",
      type: "enum",
      body: " \nb2\n \n ",
    },
    {
      name: "I3",
      type: "input",
      body: { b3: "Int" },
    },
  ];

  t.is(
    buildTypes(types),
    `type T1 {\n  b1: Int\n}\nenum E2 {\n  b2\n}\ninput I3 {\n  b3: Int\n}`
  );
});
