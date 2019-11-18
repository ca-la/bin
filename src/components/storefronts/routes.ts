import Router from 'koa-router';

import requireAuth = require('../../middleware/require-auth');
import { hasProperties } from '../../services/require-properties';
import { createStorefront } from '../../services/create-storefront';
import { ProviderName } from './tokens/domain-object';

const router = new Router();

interface StorefrontIO {
  name: string;
  accessToken: string;
  baseUrl: string;
  providerName: ProviderName.SHOPIFY;
}

function isStorefrontIO(candidate: any): candidate is StorefrontIO {
  return hasProperties(
    candidate,
    'name',
    'accessToken',
    'baseUrl',
    'providerName'
  );
}

function* createStorefrontResources(
  this: AuthedContext<StorefrontIO>
): Iterator<any, any, any> {
  const { body: newStorefront } = this.request;
  if (!isStorefrontIO(newStorefront)) {
    this.throw(400);
  }

  const storefront = yield createStorefront({
    accessToken: newStorefront.accessToken,
    baseUrl: newStorefront.baseUrl,
    name: newStorefront.name,
    providerName: newStorefront.providerName,
    userId: this.state.userId
  });

  this.status = 200;
  this.body = storefront;
}

router.post('/', requireAuth, createStorefrontResources);

export default router.routes();
