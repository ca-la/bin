import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { Participant, ParticipantRow } from "./types";

function encode(row: ParticipantRow): Participant {
  return {
    type: row.type,
    displayName: row.display_name,
    id: row.id,
    role: row.role,
    userId: row.user_id,
  };
}

function decode(data: Participant): ParticipantRow {
  return {
    type: data.type,
    display_name: data.displayName,
    id: data.id,
    role: data.role,
    user_id: data.userId,
  };
}

export const dataAdapter = buildAdapter<Participant, ParticipantRow>({
  domain: "Participant",
  requiredProperties: ["type", "displayName", "id", "role", "userId"],
  decodeTransformer: decode,
  encodeTransformer: encode,
});
