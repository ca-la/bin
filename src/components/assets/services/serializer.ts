import { Serialized } from "../../../types/serialized";
import Asset from "../domain-object";
import { hasProperties } from "@cala/ts-lib";

export function isSerializedAsset(data: any): data is Serialized<Asset> {
  return hasProperties(
    data,
    "createdAt",
    "description",
    "id",
    "mimeType",
    "originalHeightPx",
    "originalWidthPx",
    "title",
    "uploadCompletedAt",
    "userId"
  );
}

export function deserializeAsset(data: Serialized<Asset>): Asset {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    uploadCompletedAt: data.uploadCompletedAt
      ? new Date(data.uploadCompletedAt)
      : null,
  };
}

export function deserializePartialAsset(
  data: Serialized<Partial<Asset>>
): Partial<Asset> {
  let deserialized = {};
  if (data.createdAt) {
    deserialized = {
      ...deserialized,
      createdAt: new Date(data.createdAt),
    };
  }

  if (data.uploadCompletedAt !== undefined) {
    deserialized = {
      ...deserialized,
      uploadCompletedAt: data.uploadCompletedAt
        ? new Date(data.uploadCompletedAt)
        : null,
    };
  }

  return {
    ...data,
    ...deserialized,
  };
}
