import Router from "koa-router";

import * as AssetsDAO from "../dao";
import requireAuth = require("../../../middleware/require-auth");
import { uploadStatus } from "./upload-status";
import { isPartialAsset } from "../domain-object";
import {
  deserializeAsset,
  deserializePartialAsset,
  isSerializedAsset,
} from "../services/serializer";

const router = new Router();

function* findById(this: AuthedContext): Iterator<any, any, any> {
  const { assetId } = this.params;

  if (assetId) {
    const asset = yield AssetsDAO.findById(assetId);

    if (!asset) {
      this.throw(404, `Asset ${assetId} not found.`);
    }

    this.status = 200;
    this.body = asset;
  } else {
    this.throw(400, "An asset id was not provided.");
  }
}

function* create(this: AuthedContext): Iterator<any, any, any> {
  const { body } = this.request;

  if (body && isSerializedAsset(body)) {
    const asset = yield AssetsDAO.create(deserializeAsset(body));
    this.status = 201;
    this.body = asset;
  } else {
    this.throw(400, "Cannot create an asset with the supplied object.");
  }
}

function* update(this: AuthedContext): Iterator<any, any, any> {
  const { body } = this.request;
  const { assetId } = this.params;

  if (assetId && body && isPartialAsset(body)) {
    const asset = yield AssetsDAO.update(
      assetId,
      deserializePartialAsset(body)
    );
    this.status = 200;
    this.body = asset;
  } else {
    this.throw(400, "Cannot update an asset with the supplied values.");
  }
}

router.get("/:assetId", requireAuth, findById);
router.put("/:assetId", requireAuth, create);
router.patch("/:assetId", requireAuth, update);
router.put("/:assetId/upload-status", requireAuth, uploadStatus);

export default router.routes();
