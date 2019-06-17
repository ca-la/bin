import { generateFilename } from '../generate-filename';
import * as AWSService from '../../services/aws';

export interface UploadPolicy {
  contentDisposition: string;
  contentType: string;
  downloadUrl: string;
  formData: { [key: string]: any };
  remoteFileName: string;
  uploadUrl: string;
}

interface Options {
  id: string;
  mimeType: string;
  s3Bucket: string;
  s3Region: string;
}

/**
 * Generates an upload policy for a resource to the specified S3 bucket.
 */
export function generateUploadPolicy(options: Options): UploadPolicy {
  const remoteFileName = options.id;
  const filenameWithExtension = generateFilename(
    remoteFileName,
    options.mimeType
  );
  const contentDisposition = `attachment; filename="${filenameWithExtension}"`;
  const contentType = options.mimeType;
  const { url, fields } = AWSService.getUploadPolicy(
    options.s3Bucket,
    options.s3Region,
    remoteFileName,
    contentDisposition,
    contentType
  );

  return {
    contentDisposition,
    contentType,
    downloadUrl: `https://${
      options.s3Bucket
    }.s3.amazonaws.com/${remoteFileName}`,
    formData: fields,
    remoteFileName,
    uploadUrl: url
  };
}
