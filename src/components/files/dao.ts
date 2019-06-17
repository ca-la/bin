import first from '../../services/first';
import * as db from '../../services/db';
import * as rethrow from 'pg-rethrow';
import {
  dataAdapter,
  FileData,
  FileRow,
  isFileRow,
  toInsertion,
  toPartialInsertion
} from './domain-object';
import { validate } from '../../services/validate-from-db';

const TABLE_NAME = 'files';

export async function create(file: FileData): Promise<FileData> {
  const row = toInsertion(file);

  const created = await db(TABLE_NAME)
    .insert(row)
    .returning('*')
    .then((rows: FileRow[]) => {
      return first(rows);
    });

  if (!created) {
    throw new Error('Failed to create a File');
  }

  return validate<FileRow, FileData>(
    TABLE_NAME,
    isFileRow,
    dataAdapter,
    created
  );
}

export async function findById(fileId: string): Promise<FileData | null> {
  const found = await db(TABLE_NAME)
    .where({ id: fileId }, '*')
    .catch(rethrow)
    .then((rows: FileRow[]) => first(rows));

  if (!found) {
    return null;
  }

  return validate<FileRow, FileData>(TABLE_NAME, isFileRow, dataAdapter, found);
}

export async function update(
  id: string,
  fileData: Partial<FileData>
): Promise<FileData> {
  const row = toPartialInsertion(fileData);

  const updated = await db(TABLE_NAME)
    .where({ id })
    .update(row, '*')
    .then((rows: FileRow[]) => first<FileRow>(rows));

  if (!updated) {
    throw new Error('There was a problem updating the File!');
  }

  return validate<FileRow, FileData>(
    TABLE_NAME,
    isFileRow,
    dataAdapter,
    updated
  );
}
