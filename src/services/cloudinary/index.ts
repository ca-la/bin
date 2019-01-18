import Cloudinary = require('cloudinary');
import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_FOLDER
} from '../../config';

/**
 * Generates a signed request payload that can be used to upload an asset.
 */
export function generateSignedUploadPolicy(
  params: object & { public_id: string }
): { parameters: Cloudinary.utils.UploadPolicyResponse, uploadUrl: string } {
  return {
    parameters: Cloudinary.utils.sign_request({
      ...params,
      folder: CLOUDINARY_UPLOAD_FOLDER,
      timestamp: new Date().getTime()
    }, {
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET
    }),
    uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`
  };
}
