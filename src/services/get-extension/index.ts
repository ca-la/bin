import mime from "mime-types";
import { FileType, SUPPORTED_FILE_TYPES } from "../../components/assets/types";

export function getExtension(mimeType: string): string | null {
  const packageExtension = mime.extension(mimeType);
  if (packageExtension) {
    return packageExtension;
  }

  const augmentedType = SUPPORTED_FILE_TYPES.find(
    (type: FileType) => type.mimeType === mimeType
  );

  if (augmentedType) {
    return augmentedType.extension;
  }

  return null;
}
