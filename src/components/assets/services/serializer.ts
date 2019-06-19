import { Serialized } from '../../../types/serialized';
import Asset from '../domain-object';
import { hasProperties } from '@cala/ts-lib';

export function isSerializedAsset(data: any): data is Serialized<Asset> {
  return hasProperties(
    data,
    'createdAt',
    'deletedAt',
    'description',
    'id',
    'mimeType',
    'originalHeightPx',
    'originalWidthPx',
    'title',
    'uploadCompletedAt',
    'userId'
  );
}

export function deserializeAsset(data: Serialized<Asset>): Asset {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
    uploadCompletedAt: data.uploadCompletedAt
      ? new Date(data.uploadCompletedAt)
      : null
  };
}

export function deserializePartialAsset(
  data: Serialized<Partial<Asset>>
): Partial<Asset> {
  let deserialized = {};
  if (data.createdAt) {
    deserialized = {
      ...deserialized,
      createdAt: new Date(data.createdAt)
    };
  }

  if (data.deletedAt !== undefined) {
    deserialized = {
      ...deserialized,
      deletedAt: data.deletedAt ? new Date(data.deletedAt) : null
    };
  }

  if (data.uploadCompletedAt !== undefined) {
    deserialized = {
      ...deserialized,
      uploadCompletedAt: data.uploadCompletedAt
        ? new Date(data.uploadCompletedAt)
        : null
    };
  }

  return {
    ...data,
    ...deserialized
  };
}
