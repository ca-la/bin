import { getExtension } from "../get-extension";

export function generateFilename(name: string, mimeType: string): string {
  const fileExtension = getExtension(mimeType);
  return fileExtension ? `${name}.${fileExtension}` : name;
}
