import { authHeader, get } from '../../test-helpers/http';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import * as GetAllService from './services/get-all-by-design';
import createUser = require('../../test-helpers/create-user');
import createDesign from '../../services/create-design';

const API_PATH = '/nodes';

test(`GET ${API_PATH} returns a node resource object for a specific design`, async (t: Test) => {
  const stubResponse: GetAllService.NodeResources = {
    assets: [],
    attributes: {
      artworks: [],
      materials: [],
      sketches: []
    },
    nodes: []
  };
  const getAllStub = sandbox()
    .stub(GetAllService, 'getAllByDesign')
    .resolves(stubResponse);

  const { session, user } = await createUser({});
  const design = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });

  const [response, body] = await get(`${API_PATH}/?designId=${design.id}`, {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.deepEqual(body, stubResponse);
  t.equal(getAllStub.callCount, 1);
});

test(`GET ${API_PATH} returns a 403 if you do not have access`, async (t: Test) => {
  const getAllStub = sandbox()
    .stub(GetAllService, 'getAllByDesign')
    .resolves({});

  const { session } = await createUser({});
  const { user: user2 } = await createUser({});
  const design = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user2.id
  });

  const [response] = await get(`${API_PATH}/?designId=${design.id}`, {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 403);
  t.equal(getAllStub.callCount, 0);
});
