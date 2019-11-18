import userResolvers from './components/users/resolver';
import { merge } from 'lodash';
import { GraphQLDateTime } from 'graphql-iso-date';

const resolvers = {
  GraphQLDateTime
};

export default merge(resolvers, userResolvers);
