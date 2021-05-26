import { z } from "zod";
import { omit } from "lodash";
import { test, Test } from "../../test-helpers/fresh";
import { buildFindEndpoint, FindResult } from "./builders";
import { CalaDao } from "../../services/cala-component/types";
import { GraphQLContextBase } from "../types";

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
    endpointType: "Query",
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
