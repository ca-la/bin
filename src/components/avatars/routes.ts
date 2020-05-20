import Router from "koa-router";

import requireAuth = require("../../middleware/require-auth");
import { generateUploadPolicy } from "../../services/upload-policy";
import { isPreviewable } from "../../services/is-previewable";
import { purgeImage } from "../../services/imgix";
import {
  AVATAR_BASE_URL,
  AWS_S3_AVATAR_BUCKET_NAME as BUCKET_NAME,
  AWS_S3_AVATAR_BUCKET_REGION as BUCKET_REGION,
} from "../../config";

const router = new Router();

function* getAvatarUploadPolicy(this: AuthedContext): Iterator<any, any, any> {
  const { mimeType } = this.query;

  if (!mimeType) {
    this.throw(400, "A mimeType must be specified in the query parameters!");
  }

  if (!isPreviewable(mimeType)) {
    this.throw(400, "File format not supported");
  }

  const uploadPolicy = generateUploadPolicy({
    downloadBaseUrl: AVATAR_BASE_URL,
    id: this.state.userId,
    mimeType,
    s3Bucket: BUCKET_NAME,
    s3Region: BUCKET_REGION,
  });

  this.body = uploadPolicy;
  this.status = 200;
}

function* postUploadComplete(this: AuthedContext): Iterator<any, any, any> {
  const url = `${AVATAR_BASE_URL}/${this.state.userId}`;
  yield purgeImage(url);
  this.status = 204;
}

router.get("/upload-policy", requireAuth, getAvatarUploadPolicy);
router.post("/upload-complete", requireAuth, postUploadComplete);

export default router.routes();
