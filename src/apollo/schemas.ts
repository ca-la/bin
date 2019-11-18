import { gql } from 'apollo-server-core';
import usersSchema from './components/users/schema';

const baseSchema = gql`
  scalar GraphQLDateTime

  type Query {
    _empty: String
  }
`;

export default [baseSchema, usersSchema];
