import * as Router from 'koa-router';
import * as Koa from 'koa';

import * as DuplicationService from '../../services/duplicate';
import filterError = require('../../services/filter-error');
import requireAuth = require('../../middleware/require-auth');
import ResourceNotFoundError from '../../errors/resource-not-found';

const router = new Router();

interface DuplicateDesignsBody {
  designIds: string[];
}

function isDuplicateDesignsBody(body: any): body is DuplicateDesignsBody {
  return (
    body.designIds &&
    Array.isArray(body.designIds) &&
    body.designIds.every((id: any) => typeof id === 'string')
  );
}

function* duplicateDesigns(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { body } = this.request;

  if (!isDuplicateDesignsBody(body)) {
    return this.throw(400, 'Missing design ID list');
  }

  const duplicated = yield DuplicationService.duplicateDesigns(
    this.state.userId,
    body.designIds
  ).catch(
    filterError(ResourceNotFoundError, (err: ResourceNotFoundError) =>
      this.throw(400, err)
    )
  );

  this.body = duplicated;
  this.status = 201;
}

// Intentionally not checking ownership permissions - TODO reconsider security model
router.post('/designs', requireAuth, duplicateDesigns);

export default router.routes();
