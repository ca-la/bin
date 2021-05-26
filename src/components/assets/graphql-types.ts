import { GraphQLType } from "../../apollo/published-types/published-types";

export const AssetLinks: GraphQLType = {
  name: "AssetLinks",
  type: "type",
  body: {
    assetId: "String",
    assetLink: "String",
    asset3xLink: "String",
    downloadLink: "String!",
    fileType: "String!",
    thumbnail2xLink: "String",
    thumbnailLink: "String",
    originalWidthPx: "Int",
    originalHeightPx: "Int",
  },
};

export const Asset: GraphQLType = {
  name: "Asset",
  type: "type",
  body: {
    id: "String!",
    createdAt: "GraphQLDateTime!",
    description: "String",
    mimeType: "String",
    originalHeightPx: "Int",
    originalWidthPx: "Int",
    title: "String",
    uploadCompletedAt: "GraphQLDateTime",
    userId: "String",
  },
};

export const Attachment: GraphQLType = {
  name: "Attachment",
  type: "type",
  body: {
    ...Asset.body,
    ...AssetLinks.body,
  },
};
