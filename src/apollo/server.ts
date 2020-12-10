import { ApolloServer, IResolvers } from "apollo-server-koa";
import {
  GraphQLRequestContextWillSendResponse,
  GraphQLRequestContextDidEncounterErrors,
} from "apollo-server-types";
import { context } from "./context";
import { GraphQLContextBase } from "./types";
import { endpoints, Endpoint } from "./endpoints";
import { GraphQLDateTime } from "graphql-iso-date";
import { ENABLE_APOLLO_PLAYGROUND } from "../config";
import { extractSortedTypes, buildTypes } from "./service";

function extractResolvers() {
  const resolvers: Record<"Query" | "Mutation", IResolvers> = {
    Query: {},
    Mutation: {},
  };

  for (const endpoint of endpoints) {
    const wrappedResolver = endpoint.middleware
      ? ((async (parent: any, args: any, initialContext: any, info: any) => {
          const processedContext = await endpoint.middleware!(
            args,
            initialContext
          );
          const resolver = endpoint.resolver as (
            parent: any,
            args: any,
            initialContext: any,
            info: any
          ) => any;
          return resolver(parent, args, processedContext, info);
        }) as () => any)
      : (endpoint.resolver as () => any);
    if (endpoint.endpointType === "QUERY") {
      resolvers.Query[endpoint.name] = wrappedResolver;
    } else {
      resolvers.Mutation[endpoint.name] = wrappedResolver;
    }
  }
  return resolvers;
}

function extractSchema() {
  return `
${buildTypes(extractSortedTypes(endpoints))}
type Query {
  ${endpoints
    .filter((endpoint: Endpoint) => endpoint.endpointType === "QUERY")
    .map((endpoint: Endpoint) => `${endpoint.name}${endpoint.signature}`)
    .join("\n  ")}
}
type Mutation {
  ${endpoints
    .filter((endpoint: Endpoint) => endpoint.endpointType === "MUTATION")
    .map((endpoint: Endpoint) => `${endpoint.name}${endpoint.signature}`)
    .join("\n  ")}
}
  `;
}

const typeDefs = `
scalar GraphQLDateTime
input ListOptions {
  limit: Int = 20
  skip: Int = 0
}
scalar Date
type ListMeta {
  total: Int!
}
${extractSchema()}
`;

export const apolloServer = new ApolloServer({
  context,
  resolvers: {
    GraphQLDateTime,
    ...extractResolvers(),
  },
  typeDefs,
  playground: ENABLE_APOLLO_PLAYGROUND,
  plugins: [
    {
      requestDidStart() {
        return {
          didEncounterErrors: async (
            requestContext: GraphQLRequestContextDidEncounterErrors<
              GraphQLContextBase
            >
          ) => {
            await requestContext.context.trx.rollback();
          },
          willSendResponse: async (
            requestContext: GraphQLRequestContextWillSendResponse<
              GraphQLContextBase
            >
          ) => {
            if (!requestContext.context.trx.isCompleted()) {
              await requestContext.context.trx.commit();
            }
          },
        };
      },
    },
  ],
});
