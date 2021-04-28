import { ApolloServer, IResolvers } from "apollo-server-koa";
import {
  GraphQLRequestContextWillSendResponse,
  GraphQLRequestContextDidEncounterErrors,
} from "apollo-server-types";
import { GraphQLError } from "graphql";
import { context } from "./context";
import { GraphQLContextBase } from "./types";
import { endpoints, Endpoint } from "./endpoints";
import { GraphQLDateTime } from "graphql-iso-date";
import { ENABLE_APOLLO_PLAYGROUND } from "../config";
import { extractSortedTypes, buildTypes, isClientError } from "./services";
import { logServerError } from "../services/logger";

function extractResolvers() {
  const resolvers: Record<string, IResolvers> = {};

  for (const endpoint of endpoints) {
    const wrappedResolver = endpoint.middleware
      ? ((async (parent: any, args: any, initialContext: any, info: any) => {
          const processedContext = await endpoint.middleware!(
            args,
            initialContext
          );
          if (processedContext.earlyResult !== null) {
            return processedContext.earlyResult;
          }
          const resolver = endpoint.resolver as (
            parent: any,
            args: any,
            initialContext: any,
            info: any
          ) => any;
          return resolver(parent, args, processedContext, info);
        }) as () => any)
      : (endpoint.resolver as () => any);

    if (!resolvers[endpoint.endpointType]) {
      resolvers[endpoint.endpointType] = {};
    }
    resolvers[endpoint.endpointType][endpoint.name] = wrappedResolver;
  }
  return resolvers;
}

function extractSchema() {
  return `
${buildTypes(extractSortedTypes(endpoints))}
type Query {
  ${endpoints
    .filter((endpoint: Endpoint) => endpoint.endpointType === "Query")
    .map((endpoint: Endpoint) => {
      if (!endpoint.signature) {
        throw new Error(
          `Missing signature for root-level endpoint "${endpoint.name}"`
        );
      }
      return `${endpoint.name}${endpoint.signature}`;
    })
    .join("\n  ")}
}
type Mutation {
  ${endpoints
    .filter((endpoint: Endpoint) => endpoint.endpointType === "Mutation")
    .map((endpoint: Endpoint) => {
      if (!endpoint.signature) {
        throw new Error(
          `Missing signature for root-level endpoint "${endpoint.name}"`
        );
      }
      return `${endpoint.name}${endpoint.signature}`;
    })
    .join("\n  ")}
}
  `;
}

export function getApolloServer() {
  const typeDefs = `
scalar GraphQLDateTime
scalar Date
type ListMeta {
  total: Int!
}
${extractSchema()}`;

  return new ApolloServer({
    context,
    debug: false,
    resolvers: {
      GraphQLDateTime,
      ...extractResolvers(),
    },
    formatError: (error: GraphQLError): Error => {
      if (isClientError(error)) {
        return error;
      }

      logServerError(error);
      return new Error(
        "Something went wrong! Please try again, or email hi@ca.la if this message persists."
      );
    },
    typeDefs,
    playground: ENABLE_APOLLO_PLAYGROUND,
    plugins: [
      {
        requestDidStart() {
          return {
            didEncounterErrors: async (
              requestContext: GraphQLRequestContextDidEncounterErrors<
                GraphQLContextBase<null>
              >
            ) => {
              await requestContext.context.trx.rollback();
            },
            willSendResponse: async (
              requestContext: GraphQLRequestContextWillSendResponse<
                GraphQLContextBase<null>
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
}
