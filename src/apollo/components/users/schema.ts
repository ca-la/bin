import { gql } from "apollo-server-core";

export default gql`
  extend type Query {
    user(id: String!): User!
  }
  type User {
    birthday: GraphQLDateTime
    createdAt: GraphQLDateTime!
    email: String!
    id: String!
    isSmsPreregistration: Boolean!
    lastAcceptedDesignerTermsAt: GraphQLDateTime
    lastAcceptedPartnerTermsAt: GraphQLDateTime
    locale: String!
    name: String!
    passwordHash: String
    phone: String
    referralCode: String!
    role: Role!
  }
  enum Role {
    ADMIN
    FIT_PARTNER
    PARTNER
    USER
  }
`;
