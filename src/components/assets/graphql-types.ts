import { GraphQLType, schemaToGraphQLType } from "../../apollo/published-types";
import { assetLinksSchema, assetSchema, attachmentSchema } from "./types";

export const AssetLinks: GraphQLType = schemaToGraphQLType(
  "AssetLinks",
  assetLinksSchema
);

export const Asset: GraphQLType = schemaToGraphQLType("Asset", assetSchema);
export const Attachment: GraphQLType = schemaToGraphQLType(
  "Attachment",
  attachmentSchema
);

export const AttachmentInput: GraphQLType = schemaToGraphQLType(
  "AttachmentInput",
  assetSchema,
  { type: "input" }
);
