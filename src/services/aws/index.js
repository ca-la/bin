'use strict';

const mime = require('mime-types');
const AWS = require('aws-sdk');
const fs = require('fs');
const { promisify } = require('util');

const { requireValues } = require('../require-properties');

const {
  AWS_S3_THUMBNAIL_ACCESS_KEY,
  AWS_S3_THUMBNAIL_SECRET_KEY,
  AWS_S3_THUMBNAIL_BUCKET_REGION,
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY
} = require('../../config');

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY
});

/**
  * @param {String} bucketName
  * @param {String} remoteFileName
  * @param {String} localFileName
  * @resolves {String} The remote URL
  */
async function uploadFile(
  bucketName,
  remoteFileName,
  localFileName,
  contentType = 'binary/octet-stream',
  ACL = 'authenticated-read'
) {
  requireValues({ bucketName, remoteFileName, localFileName });
  const s3 = new AWS.S3();
  const put = promisify(s3.putObject.bind(s3));

  const read = promisify(fs.readFile.bind(fs));

  return read(localFileName)
    .then((buffer) => {
      return put({
        ACL,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
        Bucket: bucketName,
        Key: remoteFileName,
        Body: buffer
      });
    })
    .then(() => {
      return `https://${bucketName}.s3.amazonaws.com/${remoteFileName}`;
    });
}

/**
 * @returns {Promise}
 */
async function deleteFile(bucketName, remoteFileName) {
  requireValues({ bucketName, remoteFileName });
  const s3 = new AWS.S3();

  const del = promisify(s3.deleteObject.bind(s3));

  return del({
    Bucket: bucketName,
    Key: remoteFileName
  });
}

/**
 * @returns {Promise}
 */
async function getFile(bucketName, remoteFileName) {
  requireValues({ bucketName, remoteFileName });
  const s3 = new AWS.S3();

  const get = promisify(s3.getObject.bind(s3));

  return get({
    Bucket: bucketName,
    Key: remoteFileName
  });
}

/**
 * @returns {Promise}
 */
async function getDownloadUrl(bucketName, remoteFileName) {
  requireValues({ bucketName, remoteFileName });
  const s3 = new AWS.S3();

  const file = await getFile(bucketName, remoteFileName);
  const extension = mime.extension(file.ContentType);

  const getSignedUrl = promisify(s3.getSignedUrl.bind(s3));

  return getSignedUrl('getObject', {
    ResponseContentDisposition: `attachment; filename="${remoteFileName}.${extension}"`,
    Bucket: bucketName,
    Key: remoteFileName
  });
}

/**
 * Get POST upload policy document for product-design-images S3 bucket
 * URL expires after 60 seconds, and file must be smaller than 50 MB
 *
 * See: https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-HTTPPOSTConstructPolicy.html
 *
 * @param {string} bucketName Bucket to upload image to
 * @param {string} remoteFileName S3 object key for image
 * @returns {object} Upload/download urls, and form fields to use in POST
 */
async function getUploadPolicy(bucketName, region, remoteFileName) {
  requireValues({ bucketName, remoteFileName });
  const s3 = new AWS.S3({
    credentials: new AWS.Credentials({
      accessKeyId: AWS_ACCESS_KEY,
      secretAccessKey: AWS_SECRET_KEY
    }),
    region
  });
  const FILE_LIMIT = 500 * (1024 ** 2);

  const createPresignedPost = promisify(s3.createPresignedPost.bind(s3));

  return createPresignedPost({
    Bucket: bucketName,
    Expires: 60,
    Conditions: [
      { acl: 'public-read' },
      { key: remoteFileName },
      ['content-length-range', 0, FILE_LIMIT]
    ]
  });
}

/**
 * Get POST upload policy document for Thumbnail S3 bucket
 * URL expires after 60 seconds, and thumbnail must be smaller than 10 MB
 *
 * See: https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-HTTPPOSTConstructPolicy.html
 *
 * @param {string} bucketName Bucket to upload thumbnail to
 * @param {string} remoteFileName S3 object key for thumbnail
 * @returns {object} Upload/download urls, and form fields to use in POST
 */
async function getThumbnailUploadPolicy(bucketName, remoteFileName) {
  requireValues({ bucketName, remoteFileName });
  const s3 = new AWS.S3({
    credentials: new AWS.Credentials({
      accessKeyId: AWS_S3_THUMBNAIL_ACCESS_KEY,
      secretAccessKey: AWS_S3_THUMBNAIL_SECRET_KEY
    }),
    region: AWS_S3_THUMBNAIL_BUCKET_REGION
  });
  const TEN_MB = 10 * (1024 ** 2);

  const createPresignedPost = promisify(s3.createPresignedPost.bind(s3));

  return createPresignedPost({
    Bucket: bucketName,
    Expires: 60,
    Conditions: [
      { acl: 'public-read' },
      { key: remoteFileName },
      ['content-length-range', 0, TEN_MB]
    ]
  });
}

async function enqueueMessage(
  queueUrl,
  queueRegion,
  messageType,
  payload
) {
  requireValues({
    queueUrl, queueRegion, messageType, payload
  });
  const sqs = new AWS.SQS({ region: queueRegion });

  const params = {
    MessageAttributes: {
      type: {
        DataType: 'String',
        StringValue: messageType
      }
    },
    MessageBody: JSON.stringify(payload),
    QueueUrl: queueUrl
  };

  const send = promisify(sqs.sendMessage.bind(sqs));

  return send(params);
}

module.exports = {
  getDownloadUrl,
  getThumbnailUploadPolicy,
  getUploadPolicy,
  uploadFile,
  deleteFile,
  getFile,
  enqueueMessage
};
