import Router from 'koa-router';
import Koa from 'koa';

import * as UsersDAO from '../../components/users/dao';
import * as DuplicationService from '../../services/duplicate';
import filterError = require('../../services/filter-error');
import requireAuth = require('../../middleware/require-auth');
import ResourceNotFoundError from '../../errors/resource-not-found';

const router = new Router();

interface DuplicateDesignsBody {
  designIds: string[];
  userId?: string;
  email?: string;
}

function isDuplicateDesignsBody(body: any): body is DuplicateDesignsBody {
  return (
    body.designIds &&
    Array.isArray(body.designIds) &&
    body.designIds.every((id: any) => typeof id === 'string') &&
    (!body.userId || (body.userId && typeof body.userId === 'string')) &&
    (!body.email || (body.email && typeof body.email === 'string'))
  );
}

function* duplicateDesigns(
  this: Koa.Application.Context
): Iterator<any, any, any> {
  const { body } = this.request;
  let userId = this.state.userId;

  if (!isDuplicateDesignsBody(body)) {
    return this.throw(400, 'Missing design ID list');
  }

  if (body.userId) {
    if (this.state.role === 'ADMIN' || this.state.userId === body.userId) {
      userId = body.userId;
    } else {
      return this.throw(403, 'Cannot duplicate designs for other users');
    }
  } else if (body.email) {
    if (this.state.role !== 'ADMIN') {
      return this.throw(403, 'Cannot duplicate designs for other users');
    }

    const maybeUser = yield UsersDAO.findByEmail(body.email);
    if (!maybeUser) {
      return this.throw(404, 'User not found');
    }

    userId = maybeUser.id;
  }

  const duplicated = yield DuplicationService.duplicateDesigns(
    userId,
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
