import * as mime from 'mime-types';

export function generateFilename(name: string, mimeType: string): string {
  const fileExtension = mime.extension(mimeType);
  return fileExtension ? `${name}.${fileExtension}` : name;
}
