import * as tape from 'tape';

import { test } from '../../test-helpers/fresh';
import generateProcess from '../../test-helpers/factories/process';
import createUser = require('../../test-helpers/create-user');
import * as API from '../../test-helpers/http';
import { ComponentType } from '../../domain-objects/component';

test(
  'GET /processes returns all processes',
  async (t: tape.Test) => {
    const { session } = await createUser();
    const { process: p1 } = await generateProcess({ componentType: ComponentType.Sketch });
    const { process: p2 } = await generateProcess({ componentType: ComponentType.Material });
    const { process: p3 } = await generateProcess({ componentType: ComponentType.Artwork });

    const [getResponse, getBody] = await API.get(
      '/processes',
      { headers: API.authHeader(session.id) }
    );
    t.equal(getResponse.status, 200, 'GET returns a 200 status');
    t.deepEqual(
      getBody,
      [
        { ...p3, createdAt: p3.createdAt.toISOString() },
        { ...p2, createdAt: p2.createdAt.toISOString() },
        { ...p1, createdAt: p1.createdAt.toISOString() }
      ],
      'Successfully returns all processes'
    );

    const [getResponseTwo, getBodyTwo] = await API.get(
      '/processes?componentType=Sketch',
      { headers: API.authHeader(session.id) }
    );
    t.equal(getResponseTwo.status, 200, 'GET with componentType returns a 200 status');
    t.deepEqual(
      getBodyTwo,
      [{ ...p1, createdAt: p1.createdAt.toISOString() }],
      'Successfully returns all sketch processes'
    );

    const [getResponseThree] = await API.get(
      '/processes?componentType=FooBar',
      { headers: API.authHeader(session.id) }
    );
    t.equal(getResponseThree.status, 400, 'GET with invalid componentType returns a 400 status');

    const [getResponseFour] = await API.get(
      '/processes?componentType=FooBar',
      { headers: API.authHeader('i-am-malicious') }
    );
    t.equal(getResponseFour.status, 401, 'GET with invalid session token returns a 401 status');
  }
);
