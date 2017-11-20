'use strict';

const AWS = require('aws-sdk');
const fs = require('fs');
const Promise = require('bluebird');

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
function uploadFile(
  bucketName,
  remoteFileName,
  localFileName,
  contentType = 'binary/octet-stream',
  ACL = 'authenticated-read'
) {
  requireValues({ bucketName, remoteFileName, localFileName });
  const s3 = new AWS.S3();
  const put = Promise.promisify(s3.putObject, { context: s3 });

  const read = Promise.promisify(fs.readFile);

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
function deleteFile(bucketName, remoteFileName) {
  requireValues({ bucketName, remoteFileName });
  const s3 = new AWS.S3();

  const del = Promise.promisify(s3.deleteObject, { context: s3 });

  return del({
    Bucket: bucketName,
    Key: remoteFileName
  });
}

/**
 * @returns {Promise}
 */
function getFile(bucketName, remoteFileName) {
  requireValues({ bucketName, remoteFileName });
  const s3 = new AWS.S3();

  const get = Promise.promisify(s3.getObject, { context: s3 });

  return get({
    Bucket: bucketName,
    Key: remoteFileName
  });
}

function enqueueMessage(
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

  const send = Promise.promisify(sqs.sendMessage, { context: sqs });

  return send(params);
}

module.exports = {
  uploadFile,
  deleteFile,
  getFile,
  enqueueMessage
};
