import { merge } from 'lodash';
import { GraphQLDateTime } from 'graphql-iso-date';

import userResolvers from './components/users/resolver';
import sessionsResolvers from './components/sessions/resolver';

const resolvers = {
  GraphQLDateTime
};

export default merge(resolvers, userResolvers, sessionsResolvers);
