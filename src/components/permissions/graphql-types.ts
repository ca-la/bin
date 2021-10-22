import { GraphQLType, schemaToGraphQLType } from "../../apollo/published-types";
import { permissionsSchema } from "./types";

export const gtPermissions: GraphQLType = schemaToGraphQLType(
  "Permissions",
  permissionsSchema
);
