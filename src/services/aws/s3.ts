import AWS from 'aws-sdk';
import uuid from 'node-uuid';

export interface S3UploadParams<T> {
  resource: T;
  bucketName: string;
  contentType: string;
  acl: string;
}

export interface S3UploadResponse {
  bucketName: string;
  remoteFilename: string;
}

/**
 * Uploads a resource to S3; returns the bucket and id of the uploaded resource.
 */
export async function uploadToS3<T>(
  params: S3UploadParams<T>
): Promise<S3UploadResponse> {
  const id = uuid.v4();
  const s3 = new AWS.S3();

  const { $response: response } = await s3
    .putObject({
      Body: params.resource,
      Bucket: params.bucketName,
      ContentType: params.contentType,
      Key: id,
      ServerSideEncryption: 'AES256'
    })
    .promise();

  if (response.error) {
    throw response.error;
  }

  return {
    bucketName: params.bucketName,
    remoteFilename: id
  };
}
