import * as Router from 'koa-router';
import * as Koa from 'koa';

import requireAuth = require('../../middleware/require-auth');

import Processes from './domain-object';
import * as ProcessesDAO from './dao';
import { ComponentType } from '../../domain-objects/component';

const router = new Router();

function isComponentType(data: string): data is ComponentType {
  return data === ComponentType.Artwork
    || data === ComponentType.Material
    || data === ComponentType.Sketch;
}

function* getAll(this: Koa.Application.Context): AsyncIterableIterator<Processes> {
  const { componentType } = this.query;

  if (componentType) {
    if (isComponentType(componentType)) {
      const processes = yield ProcessesDAO.findAllByComponentType(componentType);
      this.status = 200;
      this.body = processes;
    } else {
      this.throw(400, `${componentType} is not a valid component type!`);
    }
  } else {
    const processes = yield ProcessesDAO.findAll();
    this.status = 200;
    this.body = processes;
  }
}

router.get(
  '/',
  requireAuth,
  getAll
);

export default router.routes();