'use strict';

const Promise = require('bluebird');
const AWS = require('aws-sdk');

const {
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY
} = require('../config');

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY
});

/**
  * @param {String} bucketName
  * @param {String} fileName
  * @param {String|Buffer} body
  */
function uploadFile(bucketName, fileName, body) {
  const s3 = new AWS.S3();
  const put = Promise.promisify(s3.putObject, s3);

  return put({
    Bucket: bucketName,
    key: fileName,
    Body: body
  });
}

module.exports = {
  uploadFile
};
