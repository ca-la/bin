import * as mime from 'mime-types';
import { ACCEPTED_IMAGE_TYPES } from '@cala/ts-lib';

/**
 * Determines whether or not the supplied mimeType is previewable by the app.
 * For now, we can only preview image-based filetypes.
 */
export function isPreviewable(mimeType: string): boolean {
  const extension = mime.extension(mimeType);

  if (!extension) {
    return false;
  }

  if (ACCEPTED_IMAGE_TYPES.indexOf(extension) > -1) {
    return true;
  }

  return false;
}
