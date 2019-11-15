import Router from 'koa-router';

import * as ComponentsDAO from './dao';
import Component, { isUnsavedComponent } from './domain-object';
import requireAuth = require('../../middleware/require-auth');
import { addAssetLink } from '../../services/attach-asset-links';

const router = new Router();

const attachUser = (request: any, userId: string): any => {
  return {
    ...request,
    createdBy: userId
  };
};

function* create(this: AuthedContext): Iterator<any, any, any> {
  const { assetLink, ...body } = attachUser(
    this.request.body,
    this.state.userId
  );
  if (!this.request.body || !isUnsavedComponent(body)) {
    this.throw(400, 'Request does not match Component');
  }

  const component = yield ComponentsDAO.create(body);
  this.status = 201;
  this.body = component;
}

function* update(this: AuthedContext): Iterator<any, any, any> {
  const { assetLink, ...body } = attachUser(
    this.request.body,
    this.state.userId
  );
  if (!this.request.body || !isUnsavedComponent(body)) {
    this.throw(400, 'Request does not match Component');
  }

  const component = yield ComponentsDAO.update(this.params.componentId, body);
  this.status = 200;
  this.body = component;
}

function* del(this: AuthedContext): Iterator<any, any, any> {
  const component = yield ComponentsDAO.del(this.params.componentId);
  if (!component) {
    this.throw('component delete failed', 400);
  }
  this.status = 204;
}

function* getById(this: AuthedContext): Iterator<any, any, any> {
  const component: Component = yield ComponentsDAO.findById(
    this.params.componentId
  );

  this.assert(
    component,
    404,
    `Component with id ${this.params.componentId} not found`
  );

  this.status = 200;
  this.body = yield addAssetLink(component);
}

interface GetListQuery {
  canvas?: string;
}

function* getList(this: AuthedContext): Iterator<any, any, any> {
  const query: GetListQuery = this.query;

  if (!query.canvas) {
    this.throw(400, 'Missing canvas id');
  }

  const components = yield ComponentsDAO.findAllByCanvasId(query.canvas);

  this.status = 200;
  this.body = yield Promise.all(components.map(addAssetLink));
}

router.post('/', requireAuth, create);
router.put('/:componentId', requireAuth, create);
router.patch('/:componentId', requireAuth, update);
router.del('/:componentId', requireAuth, del);

router.get('/', requireAuth, getList);
router.get('/:componentId', requireAuth, getById);

export default router.routes();
