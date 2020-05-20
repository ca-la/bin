import { gql } from "apollo-server-core";

export default gql`
  extend type Mutation {
    login(
      email: String!
      expireAfterSeconds: Int
      password: String!
      role: Role
    ): Session!
  }

  type Session {
    id: String!
    userId: String!
    createdAt: GraphQLDateTime!
    role: Role!
    expiresAt: GraphQLDateTime
    user: User!
  }
`;
