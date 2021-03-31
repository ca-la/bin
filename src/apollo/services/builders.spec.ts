import { z } from "zod";
import { omit } from "lodash";
import { test, Test } from "../../test-helpers/fresh";
import {
  schemaToGraphQLType,
  buildGraphQLSortType,
  buildGraphQLFilterType,
  buildFindEndpoint,
  FindResult,
} from "./builders";
import { GraphQLType } from "../published-types";
import { CalaDao } from "../../services/cala-component/types";
import { GraphQLContextBase } from "../types";

enum Foo {
  BAR = "BAR",
}

test("schemaToGraphQLType", async (t: Test) => {
  const schema = z.object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    deletedAt: z.string(),
    a1: z.string(),
    a2: z.string().nullable(),
    ref1: z.object({}),
    ref2: z.object({}).nullable(),
    num1: z.number().int(),
    enum1: z.nativeEnum(Foo).nullable(),
  });

  const type = schemaToGraphQLType("T1", schema, {
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
    },
  });

  t.deepEqual(type, {
    name: "T1",
    type: "input",
    body: {
      id: "String",
      a1: "String!",
      a2: "String",
      ref1: "Design!",
      ref2: "Image",
      num1: "Int!",
      enum1: "String",
    },
    requires: ["Design", "Image"],
  });
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

test("buildFindEndpoint", async (t: Test) => {
  const schema = z.object({
    a1: z.string(),
    a2: z.string().nullable(),
  });

  type Model = z.infer<typeof schema>;
  const dao = {} as CalaDao<Model>;

  const middleware = async (
    _: {
      limit?: number;
      offset?: number;
      sort?: Record<keyof Model, number | null>;
      filter: Partial<Model>;
    },
    context: GraphQLContextBase<FindResult<Model>>
  ) => {
    return context;
  };

  const endpoint = buildFindEndpoint("DesignEvent", schema, dao, middleware, {
    allowedFilterAttributes: ["a1"],
    allowedSortAttributes: ["a2"],
  });

  t.deepEqual(omit(endpoint, "resolver"), {
    endpointType: "QUERY",
    types: [
      {
        name: "DesignEvent",
        type: "type",
        body: {
          a1: "String!",
          a2: "String",
        },
        requires: [],
      },
      {
        name: "DesignEventList",
        type: "type",
        body: {
          meta: "ListMeta",
          list: `[DesignEvent]`,
        },
        requires: ["DesignEvent"],
      },
      {
        name: "DesignEventFilter",
        type: "input",
        body: {
          a1: "String",
        },
      },
      {
        name: "DesignEventSort",
        type: "input",
        body: {
          a2: "Int",
        },
      },
    ],
    name: `FindDesignEvents`,
    signature:
      "(limit: Int = 20, offset: Int = 0, filter: DesignEventFilter, sort: DesignEventSort): DesignEventList",
    middleware,
  });
});
