import { omit } from "lodash";

import {
  AWS_USER_UPLOADS_BUCKET_NAME as BUCKET_NAME,
  AWS_USER_UPLOADS_BUCKET_REGION as BUCKET_REGION,
  USER_UPLOADS_BASE_URL,
} from "../../../config";

import { gtUploadPolicy, GraphqlSafeUploadPolicy } from "./graphql-types";
import {
  GraphQLEndpoint,
  GraphQLContextAuthenticated,
  requireAuth,
} from "../../../apollo";
import * as UploadPolicyService from "../../../services/upload-policy";

interface CreateUploadPolicyArgs {
  assetId: string;
  mimeType: string;
}

export const CreateUploadPolicy: GraphQLEndpoint<
  CreateUploadPolicyArgs,
  GraphqlSafeUploadPolicy,
  GraphQLContextAuthenticated<GraphqlSafeUploadPolicy>
> = {
  endpointType: "Mutation",
  types: [gtUploadPolicy],
  name: "createUploadPolicy",
  signature: "(assetId: String!, mimeType: String!): UploadPolicy!",
  middleware: requireAuth,
  resolver: async (_: any, args: CreateUploadPolicyArgs) => {
    const { assetId, mimeType } = args;

    const uploadPolicy = UploadPolicyService.generateUploadPolicy({
      downloadBaseUrl: USER_UPLOADS_BASE_URL,
      id: assetId,
      mimeType,
      s3Bucket: BUCKET_NAME,
      s3Region: BUCKET_REGION,
    });

    return {
      ...omit(uploadPolicy, "formData"),
      formDataPayload: JSON.stringify(uploadPolicy.formData, null, 2),
    };
  },
};
