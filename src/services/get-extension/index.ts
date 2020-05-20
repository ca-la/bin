import mime from "mime-types";
import { SUPPORTED_MIME_TYPES } from "@cala/ts-lib";

export function getExtension(mimeType: string): string | null {
  const extension = mime.extension(mimeType) || SUPPORTED_MIME_TYPES[mimeType];

  if (!extension) {
    return null;
  }

  return extension;
}
