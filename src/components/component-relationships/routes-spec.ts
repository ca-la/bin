import * as tape from 'tape';

import { test } from '../../test-helpers/fresh';
import generateComponentRelationship from '../../test-helpers/factories/component-relationship';
import createUser = require('../../test-helpers/create-user');
import * as API from '../../test-helpers/http';

test(
  'GET /component-relationships/:relationshipId returns a relationship',
  async (t: tape.Test) => {
    const { session } = await createUser();
    const { componentRelationship: relationship } = await generateComponentRelationship({});

    const [getResponse, getBody] = await API.get(
      `/component-relationships/${relationship.id}`,
      { headers: API.authHeader(session.id) }
    );

    t.equal(getResponse.status, 200, 'GET returns a 200 status');
    t.deepEqual(
      { ...getBody, createdAt: null },
      {  ...relationship, createdAt: null },
      'Successfully fetches the relationshp object'
    );
  }
);
