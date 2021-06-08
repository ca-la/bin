import { z } from "zod";
import { omit } from "lodash";
import { test, Test } from "../../test-helpers/fresh";
import {
  intersection,
  schemaToGraphQLType,
  buildGraphQLSortType,
  buildGraphQLFilterType,
} from "./graphql-type-builders";
import { GraphQLType } from "./published-types";

enum Foo {
  BAR = "BAR",
}

test("intersection", async (t: Test) => {
  interface TestCase {
    title: string;
    a1: string[];
    a2: string[];
    result: string[];
  }

  const testCases: TestCase[] = [
    {
      title: "has intersection",
      a1: ["a", "b", "c"],
      a2: ["b", "c", "d"],
      result: ["b", "c"],
    },
    {
      title: "no intersection",
      a1: ["a", "b", "c"],
      a2: ["d", "e", "f"],
      result: [],
    },
    {
      title: "full intersection",
      a1: ["a", "b", "c"],
      a2: ["c", "b", "a"],
      result: ["c", "b", "a"],
    },
    {
      title: "with duplicates",
      a1: ["a", "b", "a", "c"],
      a2: ["d", "a", "a", "c", "c"],
      result: ["a", "c"],
    },
  ];

  for (const testCase of testCases) {
    t.deepEqual(
      intersection(testCase.a1, testCase.a2),
      testCase.result,
      testCase.title
    );
  }
});

test("schemaToGraphQLType", async (t: Test) => {
  const schema = z.object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    deletedAt: z.string(),
    a1: z.string(),
    a2: z.string().nullable(),
    b1: z.boolean(),
    b2: z.boolean().nullable(),
    ref1: z.object({}),
    ref2: z.object({}).nullable(),
    num1: z.number().int(),
    enum1: z.nativeEnum(Foo).nullable(),
    attachments: z.array(z.object({})),
    attachmentsNullable: z.array(z.object({})).nullable(),
  });

  const options: Parameters<typeof schemaToGraphQLType>[2] = {
    type: "input",
    isUninserted: true,
    depTypes: {
      ref1: {
        name: "Design",
        type: "type",
        body: {},
      },
      ref2: {
        name: "Image",
        type: "type",
        body: {},
      },
      attachments: {
        name: "Attachment",
        type: "type",
        body: {},
      },
      attachmentsNullable: {
        name: "Attachment",
        type: "type",
        body: {},
      },
    },
    bodyPatch: {
      injectedField: "String",
    },
  };
  const type = schemaToGraphQLType("T1", schema, options);

  t.deepEqual(type, {
    name: "T1",
    type: "input",
    body: {
      id: "String",
      a1: "String!",
      a2: "String",
      b1: "Boolean!",
      b2: "Boolean",
      ref1: "Design!",
      ref2: "Image",
      num1: "Int!",
      enum1: "String",
      injectedField: "String",
      attachments: "[Attachment]!",
      attachmentsNullable: "[Attachment]",
    },
    requires: ["Design", "Image", "Attachment"],
  });

  try {
    schemaToGraphQLType("T1", schema, {
      ...options,
      depTypes: omit(options.depTypes, "ref2"),
    });
    t.fail("Expected an error as the ref2 doesn't have definition");
  } catch (err) {
    t.is(
      err.message,
      'Found an unprocessable field ref2 when building a type "T1"'
    );
  }
});

test("buildGraphQLSortType", async (t: Test) => {
  const type: GraphQLType = {
    name: "DesignEvent",
    type: "type",
    body: {
      a1: "String",
      a2: "String!",
      a3: "Int!",
    },
  };

  const sortType = buildGraphQLSortType(type, {
    allowedAttributes: ["a1", "a3"],
  });

  t.deepEqual(sortType, {
    name: "DesignEventSort",
    type: "input",
    body: {
      a1: "Int",
      a3: "Int",
    },
  });
});

test("buildGraphQLFilterType", async (t: Test) => {
  const type: GraphQLType = {
    name: "DesignEvent",
    type: "type",
    body: {
      a1: "String",
      a2: "String!",
      a3: "Int!",
    },
  };

  const sortType = buildGraphQLFilterType(type, {
    allowedAttributes: ["a1", "a3"],
  });

  t.deepEqual(sortType, {
    name: "DesignEventFilter",
    type: "input",
    body: {
      a1: "String",
      a3: "Int",
    },
  });
});
