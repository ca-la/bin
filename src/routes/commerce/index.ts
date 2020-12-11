import Router from "koa-router";
import Proxy from "koa-proxy";
import { COMMERCE_HOST, COMMERCE_TOKEN } from "../../config";

import requireAuth = require("../../middleware/require-auth");
import requireAdmin = require("../../middleware/require-admin");
import { Request } from "koa";
import {
  fillSkus,
  fetchProductInfo,
  fetchProductVariants,
} from "../../services/commerce";

import { canAccessDesignInParam } from "../../middleware/can-access-design";

const proxy = Proxy({
  host: COMMERCE_HOST,
  map(path: string) {
    return path.replace(/^\/commerce/, "/api");
  },
  requestOptions(_: Request, opts: any) {
    opts.headers["Authorization"] = `Token ${COMMERCE_TOKEN}`;
    return opts;
  },
});

const legacyProxy = function* (
  this: AuthedContext,
  next: () => Promise<any>
): Iterator<any, any, any> {
  yield proxy(this, next);
};

function* fillStorefrontVariantSkus(this: AuthedContext) {
  const { storefrontId } = this.params;

  const filledCount = yield fillSkus(storefrontId);
  this.body = { filledCount };
  this.status = 200;
}

function* getProductInfo(
  this: AuthedContext<{}, AuthedState, { designId: string }>
) {
  const { designId } = this.params;
  this.body = yield fetchProductInfo(designId);
  this.status = 200;
}

function* getProductVariants(
  this: AuthedContext<
    {},
    AuthedState,
    {
      designId: string;
      storefrontId: string;
    }
  >
) {
  const { designId, storefrontId } = this.params;
  const { externalProductId } = this.query;

  this.body = yield fetchProductVariants(
    designId,
    storefrontId,
    typeof externalProductId === "string" ? externalProductId : null
  );
  this.status = 200;
}

const router = new Router();

// user-level routes processed by API
router.use("*", requireAuth);
router.get("/product-info/:designId", canAccessDesignInParam, getProductInfo);
router.get(
  "/product-variants/:designId/:storefrontId",
  canAccessDesignInParam,
  getProductVariants
);

// admin-level routes processed by API
router.use("*", requireAdmin);
router.post("/storefronts/:storefrontId/fill-skus", fillStorefrontVariantSkus);

// other routes processed by commerce
router.get("*", legacyProxy);
router.post("*", legacyProxy);
router.put("*", legacyProxy);
router.patch("*", legacyProxy);
router.del("*", legacyProxy);

export = router.routes();
