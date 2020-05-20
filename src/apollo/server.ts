import { ApolloServer } from "apollo-server-koa";
import typeDefs from "./schemas";
import resolvers from "./resolvers";
import context from "./context";
import { ENABLE_APOLLO_PLAYGROUND } from "../config";

const server = new ApolloServer({
  context,
  resolvers,
  typeDefs,
  playground: ENABLE_APOLLO_PLAYGROUND,
});

export default server;
