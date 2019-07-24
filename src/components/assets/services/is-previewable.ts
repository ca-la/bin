import { ACCEPTED_IMAGE_TYPES } from '@cala/ts-lib';
import { getExtension } from './get-extension';

/**
 * Determines whether or not the supplied mimeType is previewable by the app.
 * For now, we can only preview image-based filetypes.
 */
export function isPreviewable(mimeType: string): boolean {
  const extension = getExtension(mimeType);

  if (!extension) {
    return false;
  }

  if (ACCEPTED_IMAGE_TYPES.indexOf(extension) > -1) {
    return true;
  }

  return false;
}
