import { buildAdapter } from "../../services/cala-component/cala-adapter";
import {
  BidTaskTypeId,
  taskTypesById,
  idsByTaskTypeTitle,
} from "../bid-task-types/types";
import {
  Participant,
  ParticipantRow,
  participantRowSchema,
  participantSchema,
} from "./types";

function encode(row: ParticipantRow): Participant {
  return participantSchema.parse({
    type: row.type,
    displayName: row.display_name,
    id: row.id,
    role: row.role,
    userId: row.user_id,
    bidTaskTypes: row.bid_task_type_ids.map(
      (id: BidTaskTypeId) => taskTypesById[id].title
    ),
  });
}

function decode(data: Participant): ParticipantRow {
  return participantRowSchema.parse({
    type: data.type,
    display_name: data.displayName,
    id: data.id,
    role: data.role,
    user_id: data.userId,
    bid_task_type_ids: data.bidTaskTypes.reduce(
      (ids: BidTaskTypeId[], title: string) => {
        const id: BidTaskTypeId | undefined = idsByTaskTypeTitle[title];

        return id ? [...ids, id] : ids;
      },
      []
    ),
  });
}

export const dataAdapter = buildAdapter<Participant, ParticipantRow>({
  domain: "Participant",
  requiredProperties: [],
  decodeTransformer: decode,
  encodeTransformer: encode,
});
