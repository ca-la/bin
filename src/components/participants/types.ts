import { MentionType } from "../comments/types";

export interface Participant {
  type: MentionType;
  id: string;
  displayName: string;
}

export interface ParticipantRow {
  type: MentionType;
  id: string;
  display_name: string;
}
