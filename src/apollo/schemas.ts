import { gql } from "apollo-server-core";
import usersSchema from "./components/users/schema";
import sessionsSchema from "./components/sessions/schema";

const baseSchema = gql`
  scalar GraphQLDateTime

  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }
`;

export default [baseSchema, usersSchema, sessionsSchema];
