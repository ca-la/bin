import Koa from 'koa';
import * as nodeFetch from 'node-fetch';
import shopifyAuth from '@cala/koa-shopify-auth';
import {
  NextFunction,
  OAuthStartOptions
} from '@cala/koa-shopify-auth/src/types';

import { addJson } from '../../services/add-json-querystring';
import { SHOPIFY_CALA_APP_AUTH, STUDIO_HOST } from '../../config';
import { ProviderName } from '../../components/storefronts/tokens/domain-object';

declare global {
  namespace NodeJS {
    interface Global {
      fetch: (
        input: nodeFetch.RequestInfo,
        init?: nodeFetch.RequestInit
      ) => Promise<nodeFetch.Response>;
      Headers: typeof nodeFetch.Headers;
      Request: typeof nodeFetch.Request;
      Response: typeof nodeFetch.Response;
    }
  }
}

global.fetch = nodeFetch.default;
global.Headers = nodeFetch.Headers;
global.Request = nodeFetch.Request;
global.Response = nodeFetch.Response;

export default function shopifyWrapper(
  options: Partial<OAuthStartOptions> = {}
): (ctx: Koa.Context, next: NextFunction) => Promise<void> {
  const [apiKey, secret] = SHOPIFY_CALA_APP_AUTH.split(':');
  return shopifyAuth({
    prefix: '/oauth/shopify',
    secret,
    apiKey,
    accessMode: 'offline',
    scopes: ['write_products', 'write_inventory'],
    afterAuth: async (
      ctx: PublicContext<
        {},
        { shopify: { accessToken: string; shop: string }; userId?: string }
      >
    ): Promise<void> => {
      const newStorefront = {
        accessToken: ctx.state.shopify.accessToken,
        baseUrl: `https://${ctx.state.shopify.shop}`,
        name: ctx.state.shopify.shop,
        providerName: ProviderName.SHOPIFY
      };
      const query = addJson('shopifyAuth', newStorefront);
      ctx.redirect(`${STUDIO_HOST}?${query}`);
    },
    ...options
  });
}
