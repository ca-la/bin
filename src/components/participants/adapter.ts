import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { Participant, ParticipantRow } from "./types";

function encode(row: ParticipantRow): Participant {
  return {
    type: row.type,
    displayName: row.display_name,
    id: row.id,
  };
}

function decode(data: Participant): ParticipantRow {
  return {
    type: data.type,
    display_name: data.displayName,
    id: data.id,
  };
}

export const dataAdapter = buildAdapter<Participant, ParticipantRow>({
  domain: "Participant",
  requiredProperties: ["type", "displayName", "id"],
  decodeTransformer: decode,
  encodeTransformer: encode,
});
