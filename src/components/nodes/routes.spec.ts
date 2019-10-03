import * as uuid from 'node-uuid';
import { authHeader, get } from '../../test-helpers/http';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import * as GetAllService from './services/get-all-by-design';
import createUser = require('../../test-helpers/create-user');
import createDesign from '../../services/create-design';
import { staticLayoutAttribute } from '../../test-helpers/factories/layout-attribute';
import { staticImageAttribute } from '../../test-helpers/factories/image-attribute';

const API_PATH = '/nodes';

test(`GET ${API_PATH} returns a node resource object for a specific design`, async (t: Test) => {
  const stubResponse: GetAllService.NodeResources = {
    assets: [],
    attributes: {
      artworks: [],
      dimensions: [],
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

test(`GET ${API_PATH}?include=* returns the PhidiasNodes for a specific design`, async (t: Test) => {
  const testDate = new Date(2019, 3, 20);
  sandbox().useFakeTimers(testDate);
  const fakeNode = {
    type: 'FRAME',
    id: uuid.v4(),
    createdAt: testDate,
    createdBy: uuid.v4(),
    deletedAt: null,
    image: staticImageAttribute(),
    layout: staticLayoutAttribute(),
    parentId: null,
    x: 0,
    y: 0,
    ordering: 0,
    title: null
  };
  const stubResponse = [fakeNode];
  const getAllStub = sandbox()
    .stub(GetAllService, 'getAllByDesignInclude')
    .resolves(stubResponse);

  const { session, user } = await createUser({});
  const design = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });

  const [response, body] = await get(
    `${API_PATH}/?designId=${design.id}&include=*`,
    {
      headers: authHeader(session.id)
    }
  );

  t.equal(response.status, 200);
  t.deepEqual(body, [
    {
      ...fakeNode,
      createdAt: fakeNode.createdAt.toISOString(),
      image: {
        ...fakeNode.image,
        createdAt: fakeNode.image.createdAt.toISOString()
      },
      layout: {
        ...fakeNode.layout,
        createdAt: fakeNode.layout.createdAt.toISOString()
      }
    }
  ]);
  t.equal(getAllStub.callCount, 1);

  const [, keyedCollection] = await get(
    `${API_PATH}/?designId=${design.id}&keyBy=id&include=*`,
    {
      headers: authHeader(session.id)
    }
  );

  t.deepEqual(
    keyedCollection,
    {
      [fakeNode.id]: {
        ...fakeNode,
        createdAt: fakeNode.createdAt.toISOString(),
        image: {
          ...fakeNode.image,
          createdAt: fakeNode.image.createdAt.toISOString()
        },
        layout: {
          ...fakeNode.layout,
          createdAt: fakeNode.layout.createdAt.toISOString()
        }
      }
    },
    'Will key by ID if query specifies that transform'
  );
});
