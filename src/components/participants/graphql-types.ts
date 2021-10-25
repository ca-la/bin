import { schemaToGraphQLType } from "../../apollo/published-types";
import { participantSchema } from "./types";
import { gtRole } from "../users/graphql-types";

export const Participant = schemaToGraphQLType(
  "Participant",
  participantSchema,
  {
    depTypes: {
      role: gtRole,
    },
    bodyPatch: {
      bidTaskTypes: "[String]",
    },
  }
);
