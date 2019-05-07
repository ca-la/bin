import * as Router from 'koa-router';
import * as Koa from 'koa';

import requireAuth = require('../../middleware/require-auth');
import requireAdmin = require('../../middleware/require-admin');
import ResolveAccount, { isResolveAccountRequest } from './domain-object';
import * as ResolveAccountsDAO from './dao';
import { getAllResolveAccountData, hasResolveAccount } from './resolve';

const router = new Router();

function* create(this: Koa.Application.Context): AsyncIterableIterator<ResolveAccount> {
  const { body } = this.request;
  if (isResolveAccountRequest(body)) {
    const accountExists = yield hasResolveAccount(body.resolveCustomerId);

    if (!accountExists) {
      return this.throw(404, 'This account does not exist in resolve.');
    }
    const account = yield ResolveAccountsDAO.create(body);
    this.status = 201;
    this.body = account;
  } else {
    this.throw(400, 'Invalid Request');
  }
}

function* getAll(this: Koa.Application.Context): AsyncIterableIterator<ResolveAccount[]> {
  const { userId } = this.query;

  if (userId) {
    if (userId !== this.state.userId && this.state.role !== 'ADMIN') {
      return this.throw(403, 'Not authorized to view this resource');
    }
    const accounts = yield ResolveAccountsDAO.findAllByUserId(userId);
    const accountData = yield getAllResolveAccountData(accounts);
    this.status = 200;
    this.body = accountData;
  } else {
    this.throw(400, 'Missing user id query params');
  }
}

function* getById(this: Koa.Application.Context): AsyncIterableIterator<ResolveAccount> {
  const { resolveAccountId } = this.params;
  const account = ResolveAccountsDAO.findById(resolveAccountId);
  if (!account) {
    this.throw(404, 'Account not found');
  }
}

router.get('/', requireAuth, getAll);
router.post('/', requireAdmin, create);
router.get('/:resolveAccountId', requireAdmin, getById);

export default router.routes();
