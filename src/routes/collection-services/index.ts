// This File will Be Removed after collection services are removed from studio

import * as Router from 'koa-router';
import * as Koa from 'koa';

const router = new Router();

function* updateService(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  this.status = 200;
}

function* getList(this: Koa.Application.Context): AsyncIterableIterator<any> {
  this.status = 200;
  this.body = [];
}

router.get('/', getList);
router.patch('/:collectionServiceId', updateService);

export = router.routes();
