import { MentionType } from "../comments/types";
import { CollaboratorRole } from "../collaborators/types";

export interface Participant {
  type: MentionType;
  id: string;
  displayName: string;
  role: CollaboratorRole;
  userId: string | null;
}

export interface ParticipantRow {
  type: MentionType;
  id: string;
  display_name: string;
  role: CollaboratorRole;
  user_id: string | null;
}
