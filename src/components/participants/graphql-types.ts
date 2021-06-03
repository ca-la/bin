import { schemaToGraphQLType } from "../../apollo/published-types";
import { participantSchema } from "./types";

export const Participant = schemaToGraphQLType(
  "Participant",
  participantSchema
);
