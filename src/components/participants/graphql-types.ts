import { schemaToGraphQLType } from "../../apollo/published-types";
import { participantSchema } from "./types";
import { Role } from "../users/graphql-types";

export const Participant = schemaToGraphQLType(
  "Participant",
  participantSchema,
  {
    depTypes: {
      role: Role,
    },
    bodyPatch: {
      bidTaskTypes: "[String]",
    },
  }
);
