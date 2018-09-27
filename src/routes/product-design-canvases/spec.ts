import * as ProductDesignCanvasesDAO from '../../dao/product-design-canvases';
import * as tape from 'tape';
import * as uuid from 'node-uuid';
import createUser = require('../../test-helpers/create-user');
import { authHeader, del, get, post, put } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';

test('GET /:canvasId returns Canvas', async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = {
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  };

  sandbox().stub(ProductDesignCanvasesDAO, 'findById').returns(Promise.resolve(data));

  const [response, body] = await get(`/product-design-canvases/${id}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test('GET /design/:designId returns a list of Canvases', async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = [{
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  }];

  sandbox().stub(ProductDesignCanvasesDAO, 'findAllByDesignId').returns(Promise.resolve(data));

  const [response, body] = await get(`/product-design-canvases/design/${id}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test('POST / returns a Canvas', async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = {
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  };

  sandbox().stub(ProductDesignCanvasesDAO, 'create').returns(Promise.resolve(data));

  const [response, body] = await post('/product-design-canvases/', {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.deepEqual(body, data);
});

test('PUT /:canvasId returns a Canvas', async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = {
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  };

  sandbox().stub(ProductDesignCanvasesDAO, 'update').returns(Promise.resolve(data));

  const [response, body] = await put(`/product-design-canvases/${id}`, {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test('DELETE /:canvasId returns a Canvas', async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = {
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  };

  sandbox().stub(ProductDesignCanvasesDAO, 'del').returns(Promise.resolve(data));

  const [response, body] = await del(`/product-design-canvases/${id}`, {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 204);
  t.equal(body, '');
});
