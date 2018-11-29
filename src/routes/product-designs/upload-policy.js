'use strict';

const uuid = require('node-uuid');

const {
  AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME,
  AWS_PRODUCT_DESIGN_IMAGE_BUCKET_REGION,
  AWS_S3_THUMBNAIL_BUCKET_NAME
} = require('../../config');
const AWSService = require('../../services/aws');
const { generateFilename } = require('../../services/generate-filename');

function* getDesignUploadPolicy() {
  const remoteFileName = this.params.id || uuid.v4();
  const filenameWithExtension = generateFilename(remoteFileName, this.query.mimeType);
  const contentDisposition = `attachment; filename="${filenameWithExtension}"`;
  const contentType = this.query.mimeType;
  const { url, fields } = yield AWSService.getUploadPolicy(
    AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME,
    AWS_PRODUCT_DESIGN_IMAGE_BUCKET_REGION,
    remoteFileName,
    contentDisposition,
    contentType
  );

  this.body = {
    contentDisposition,
    contentType,
    downloadUrl: `https://${AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME}.s3.amazonaws.com/${remoteFileName}`,
    formData: fields,
    remoteFileName,
    uploadUrl: url
  };
  this.status = 200;
}

function* getThumbnailUploadPolicy() {
  const remoteFileName = this.params.sectionId || uuid.v4();
  const { url, fields } = yield AWSService.getThumbnailUploadPolicy(
    AWS_S3_THUMBNAIL_BUCKET_NAME,
    remoteFileName
  );

  this.body = {
    downloadUrl: `https://${AWS_S3_THUMBNAIL_BUCKET_NAME}.s3.amazonaws.com/${remoteFileName}`,
    formData: fields,
    remoteFileName,
    uploadUrl: url
  };
  this.status = 200;
}

module.exports = {
  getDesignUploadPolicy,
  getThumbnailUploadPolicy
};
