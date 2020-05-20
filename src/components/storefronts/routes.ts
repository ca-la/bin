import Router from "koa-router";

import requireAuth = require("../../middleware/require-auth");
import { hasProperties } from "../../services/require-properties";
import { createStorefront } from "../../services/create-storefront";
import { ProviderName } from "./tokens/domain-object";
import requireAdmin = require("../../middleware/require-admin");
import { findById } from "./dao";
import db from "../../services/db";
import Knex from "knex";
import { findByStorefront } from "./tokens/dao";

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
    "name",
    "accessToken",
    "baseUrl",
    "providerName"
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
    userId: this.state.userId,
  });

  this.status = 200;
  this.body = storefront;
}

function* getById(this: AuthedContext): Iterator<any, any, any> {
  const { storefrontId } = this.params;
  const storefront = yield db.transaction((trx: Knex.Transaction) =>
    findById({ trx, id: storefrontId })
  );

  if (!storefront) {
    this.throw(404, "Storefront not found");
  }

  this.status = 200;
  this.body = storefront;
}

function* getTokensById(this: AuthedContext): Iterator<any, any, any> {
  const { storefrontId } = this.params;

  const storefrontTokens = yield db.transaction((trx: Knex.Transaction) =>
    findByStorefront({ trx, storefrontId })
  );

  if (storefrontTokens.length === 0) {
    this.throw(404, "Storefront tokens not found");
  }

  this.status = 200;
  this.body = storefrontTokens;
}

router.post("/", requireAuth, createStorefrontResources);
router.get("/:storefrontId", requireAuth, getById);
router.get("/:storefrontId/tokens", requireAdmin, getTokensById);
export default router.routes();
