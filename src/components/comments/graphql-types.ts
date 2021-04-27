import { GraphQLType } from "../../apollo/published-types";

export const CommentWithResources: GraphQLType = {
  name: "CommentWithResources",
  type: "type",
  body: {
    id: "String!",
    createdAt: "GraphQLDateTime!",
    deletedAt: "GraphQLDateTime",
    text: "String!",
    parentCommentId: "String",
    userId: "String",
    isPinned: "Boolean",
    userName: "String",
    userEmail: "String",
    userRole: "Role!",
    attachments: "[AssetWithLinks]!",
  },
  requires: ["Role", "AssetWithLinks"],
};
