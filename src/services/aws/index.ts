import * as mime from 'mime-types';
import * as AWS from 'aws-sdk';
import {
  DeleteObjectOutput,
  GetObjectOutput,
  PresignedPost
} from 'aws-sdk/clients/s3';
import { PromiseResult } from 'aws-sdk/lib/request';
import * as fs from 'fs';
import {
  AWS_ACCESS_KEY,
  AWS_S3_THUMBNAIL_ACCESS_KEY,
  AWS_S3_THUMBNAIL_BUCKET_REGION,
  AWS_S3_THUMBNAIL_SECRET_KEY,
  AWS_SECRET_KEY
} from '../../config';

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY
});

export async function uploadFile(
  bucketName: string,
  remoteFileName: string,
  localFileName: string,
  contentType: string = 'binary/octet-stream',
  acl: string = 'authenticated-read'
): Promise<string> {
  const s3 = new AWS.S3();
  const buffer = fs.readFileSync(localFileName);

  const { $response: response } = await s3
    .putObject({
      ACL: acl,
      Body: buffer,
      Bucket: bucketName,
      ContentType: contentType,
      Key: remoteFileName,
      ServerSideEncryption: 'AES256'
    })
    .promise();

  if (response.error) {
    throw response.error;
  }

  return `https://${bucketName}.s3.amazonaws.com/${remoteFileName}`;
}

export async function deleteFile(
  bucketName: string,
  remoteFileName: string
): Promise<PromiseResult<DeleteObjectOutput, AWS.AWSError>> {
  const s3 = new AWS.S3();
  return s3
    .deleteObject({
      Bucket: bucketName,
      Key: remoteFileName
    })
    .promise();
}

export async function getFile(
  bucketName: string,
  remoteFileName: string
): Promise<PromiseResult<GetObjectOutput, AWS.AWSError>> {
  const s3 = new AWS.S3();
  return s3
    .getObject({
      Bucket: bucketName,
      Key: remoteFileName
    })
    .promise();
}

export async function getDownloadUrl(
  bucketName: string,
  remoteFileName: string
): Promise<string> {
  const s3 = new AWS.S3();
  const file = await getFile(bucketName, remoteFileName);
  const extension = mime.extension(file.ContentType || '');

  return s3.getSignedUrl('getObject', {
    Bucket: bucketName,
    Key: remoteFileName,
    ResponseContentDisposition: `attachment; filename="${remoteFileName}.${extension}"`
  });
}

/**
 * Get POST upload policy document for product-design-images S3 bucket
 * URL expires after 60 seconds, and file must be smaller than 500 MB
 *
 * See: https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-HTTPPOSTConstructPolicy.html
 */
export function getUploadPolicy(
  bucketName: string,
  region: string,
  remoteFileName: string,
  contentDisposition: string,
  contentType: string = 'binary/octet-stream'
): PresignedPost {
  const s3 = new AWS.S3({ region });
  const FILE_LIMIT = 500 * 1024 ** 2;

  return s3.createPresignedPost({
    Bucket: bucketName,
    Conditions: [
      { acl: 'public-read' },
      { key: remoteFileName },
      ['eq', '$content-disposition', contentDisposition],
      ['eq', '$content-type', contentType],
      ['content-length-range', 0, FILE_LIMIT]
    ],
    Expires: 60
  });
}

/**
 * Get POST upload policy document for Thumbnail S3 bucket
 * URL expires after 60 seconds, and thumbnail must be smaller than 10 MB
 *
 * See: https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-HTTPPOSTConstructPolicy.html
 */
export function getThumbnailUploadPolicy(
  bucketName: string,
  remoteFileName: string
): PresignedPost {
  if (!AWS_S3_THUMBNAIL_ACCESS_KEY) {
    throw new Error('AWS_S3_THUMBNAIL_ACCESS_KEY not set as an env variable!');
  }
  if (!AWS_S3_THUMBNAIL_SECRET_KEY) {
    throw new Error('AWS_S3_THUMBNAIL_SECRET_KEY not set as an env variable!');
  }

  const s3 = new AWS.S3({
    credentials: new AWS.Credentials({
      accessKeyId: AWS_S3_THUMBNAIL_ACCESS_KEY,
      secretAccessKey: AWS_S3_THUMBNAIL_SECRET_KEY
    }),
    region: AWS_S3_THUMBNAIL_BUCKET_REGION
  });
  const TEN_MB = 10 * 1024 ** 2;

  return s3.createPresignedPost({
    Bucket: bucketName,
    Conditions: [
      { acl: 'public-read' },
      { key: remoteFileName },
      ['content-length-range', 0, TEN_MB]
    ],
    Expires: 60
  });
}
