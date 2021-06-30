import { z } from "zod";
import { GraphQLType, schemaToGraphQLType } from "../../apollo/published-types";
import { Role } from "../users/graphql-types";
import { Attachment } from "../assets/graphql-types";
import { Mention } from "../notifications/graphql-types";
import { commentSchema } from "./types";
import { assetLinksSchema, assetSchema } from "../assets/types";

const mentionsSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
});

export const commentWithResourcesSchema = commentSchema
  .omit({ attachments: true })
  .extend({
    mentions: z.array(mentionsSchema).nullable(),
    attachments: z.array(z.intersection(assetSchema, assetLinksSchema)),
  });

export type CommentWithResourcesGraphQLType = z.infer<
  typeof commentWithResourcesSchema
>;

export const CommentWithResources = schemaToGraphQLType(
  "CommentWithResources",
  commentWithResourcesSchema,
  {
    depTypes: {
      userRole: Role,
      attachments: Attachment,
      mentions: Mention,
    },
  }
);

const commentInputSchema = z.object({
  id: z.string(),
  text: z.string(),
  parentCommentId: z.string().nullable(),
  isPinned: z.boolean(),
  approvalStepId: z.string().nullable(),
  annotationId: z.string().nullable(),
});

export type CommentInputType = z.infer<typeof commentInputSchema>;

export const CommentInput = schemaToGraphQLType(
  "CommentInput",
  commentInputSchema,
  {
    type: "input",
  }
);

export const PaginatedComments: GraphQLType = {
  name: "PaginatedComments",
  type: "type",
  body: {
    data: "[CommentWithResources]!",
    nextCursor: "String",
    previousCursor: "String",
  },
  requires: ["CommentWithResources"],
};
