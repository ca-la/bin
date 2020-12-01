import Router from "koa-router";
import Knex from "knex";

import * as ProductDesignVariantsDAO from "./dao";
import {
  canAccessDesignInQuery,
  canEditDesign,
} from "../../middleware/can-access-design";
import { hasProperties } from "../../services/require-properties";
import db from "../../services/db";
import { requireQueryParam } from "../../middleware/require-query-param";
import backfillUpcsForDesign from "../../services/backfill-upcs-for-design";
import useTransaction from "../../middleware/use-transaction";
import { ProductDesignVariantIO } from "./types";
import { enrichVariantInputsWithCodesIfCheckedOut } from "./service";
import requireAuth = require("../../middleware/require-auth");
import requireAdmin = require("../../middleware/require-admin");

const router = new Router();

function isProductDesignVariantIO(
  candidate: object
): candidate is ProductDesignVariantIO {
  return (
    hasProperties(
      candidate,
      "colorName",
      "designId",
      "id",
      "position",
      "sizeName",
      "unitsToProduce",
      "universalProductCode",
      "sku"
    ) ||
    // Legacy variants will not have universalProductCode and sku
    hasProperties(
      candidate,
      "colorName",
      "designId",
      "id",
      "position",
      "sizeName",
      "unitsToProduce"
    )
  );
}

function isProductDesignVariantsIO(
  candidates: object[]
): candidates is ProductDesignVariantIO[] {
  return candidates.every(isProductDesignVariantIO);
}

function* replaceVariants(
  this: AuthedContext<ProductDesignVariantIO[], PermissionsKoaState>
): Iterator<any, any, any> {
  const { designId } = this.query;
  const { body } = this.request;

  if (!designId) {
    this.throw(
      400,
      "A designId needs to be specified in the query parameters!"
    );
  }
  if (!this.state.permissions || !this.state.permissions.canEditVariants) {
    this.throw(
      400,
      "These variants are locked! You cannot edit variants after payment."
    );
  }

  if (Array.isArray(body) && isProductDesignVariantsIO(body)) {
    this.body = yield db.transaction(async (trx: Knex.Transaction) =>
      ProductDesignVariantsDAO.replaceForDesign(
        trx,
        designId,
        await enrichVariantInputsWithCodesIfCheckedOut(trx, designId, body)
      )
    );
    this.status = 200;
  } else {
    this.throw(400, "Request does not match product design variants");
  }
}

function* getVariants(this: AuthedContext): Iterator<any, any, any> {
  const { designId } = this.query;

  if (!designId) {
    this.throw(
      400,
      "A designId needs to be specified in the query parameters!"
    );
  }

  this.body = yield ProductDesignVariantsDAO.findByDesignId(designId);
  this.status = 200;
}

function* backfillUpcs(
  this: TrxContext<AuthedContext>
): Iterator<any, any, any> {
  const { designId } = this.query;
  const { trx } = this.state;
  this.body = yield backfillUpcsForDesign(trx, designId);
  this.status = 200;
}

router.put(
  "/",
  requireAuth,
  canAccessDesignInQuery,
  canEditDesign,
  replaceVariants
);
router.get("/", requireAuth, canAccessDesignInQuery, getVariants);
router.post(
  "/backfill-upcs",
  requireQueryParam("designId"),
  requireAdmin,
  useTransaction,
  backfillUpcs
);
export default router.routes();
