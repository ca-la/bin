import { GraphQLType } from "../../apollo/published-types";

export const Role: GraphQLType = {
  name: "Role",
  type: "enum",
  body: `ADMIN\n  FIT_PARTNER\n  PARTNER\n  USER`,
};

export const User: GraphQLType = {
  name: "User",
  type: "type",
  body: {
    birthday: "String",
    createdAt: "Date",
    email: "String",
    id: "String!",
    isSmsPreregistration: "Boolean!",
    lastAcceptedDesignerTermsAt: "GraphQLDateTime",
    lastAcceptedPartnerTermsAt: "GraphQLDateTime",
    locale: "String!",
    name: "String",
    phone: "String",
    referralCode: "String",
    role: "Role!",
  },
  requires: ["Role"],
};
