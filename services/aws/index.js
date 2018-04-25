'use strict';

const mime = require('mime-types');
const AWS = require('aws-sdk');
const fs = require('fs');
const { promisify } = require('util');

const { requireValues } = require('../require-properties');

const {
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

async function enqueueMessage(
  queueUrl,
  queueRegion,
  messageType,
  payload
) {
  requireValues({ queueUrl, queueRegion, messageType, payload });
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
  uploadFile,
  deleteFile,
  getFile,
  enqueueMessage
};
