import * as ProductDesignCanvasesDAO from '../../dao/product-design-canvases';
import * as ComponentsDAO from '../../dao/components';
import * as tape from 'tape';
import * as uuid from 'node-uuid';
import createUser = require('../../test-helpers/create-user');
import { authHeader, del, get, patch, post, put } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';

test('GET /product-design-canvases/:canvasId returns Canvas', async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = {
    componentId: null,
    components: [],
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  };

  sandbox().stub(ProductDesignCanvasesDAO, 'findById').resolves(data);
  sandbox().stub(ComponentsDAO, 'findById').returns(Promise.resolve([]));

  const [response, body] = await get(`/product-design-canvases/${id}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test('GET /product-design-canvases/?designId=:designId returns a list of Canvases',
async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = [{
    components: {},
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  }];

  sandbox().stub(ProductDesignCanvasesDAO, 'findAllByDesignId').resolves(data);

  const [response, body] = await get(`/product-design-canvases?designId=${id}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test('POST /product-design-canvases/ returns a Canvas', async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = {
    componentId: null,
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  };

  sandbox().stub(ProductDesignCanvasesDAO, 'create').resolves(data);

  const [response, body] = await post('/product-design-canvases/', {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.deepEqual(body, data);
});

test('PUT /product-design-canvases/:id returns a Canvas', async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = {
    componentId: null,
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  };

  sandbox().stub(ProductDesignCanvasesDAO, 'create').resolves(data);

  const [response, body] = await put(`/product-design-canvases/${id}`, {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.deepEqual(body, data);
});

test('PATCH /product-design-canvases/:canvasId returns a Canvas', async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = {
    componentId: null,
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  };

  sandbox().stub(ProductDesignCanvasesDAO, 'update').resolves(data);

  const [response, body] = await patch(`/product-design-canvases/${id}`, {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test('DELETE /product-design-canvases/:canvasId deletes a Canvas', async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = {
    componentId: null,
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  };

  sandbox().stub(ProductDesignCanvasesDAO, 'del').resolves('');

  const [response] = await del(`/product-design-canvases/${id}`, {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 204);
});
