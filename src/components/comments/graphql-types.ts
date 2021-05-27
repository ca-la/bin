import { z } from "zod";
import { GraphQLType, schemaToGraphQLType } from "../../apollo/published-types";
import { userRoleSchema } from "../users/types";
import { Role } from "../users/graphql-types";
import { attachmentSchema } from "../assets/types";
import { Attachment } from "../assets/graphql-types";

export const commentWithResourcesSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
  text: z.string(),
  parentCommentId: z.string().nullable(),
  userId: z.string().nullable(),
  isPinned: z.boolean().nullable(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
  userRole: userRoleSchema,
  attachments: z.array(attachmentSchema),
  replyCount: z.number().optional(),
});

export type CommentWithResourcesType = z.infer<
  typeof commentWithResourcesSchema
>;

export const CommentWithResources = schemaToGraphQLType(
  "CommentWithResources",
  commentWithResourcesSchema,
  {
    depTypes: {
      userRole: Role,
      attachments: Attachment,
    },
  }
);

const commentInputSchema = z.object({
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
