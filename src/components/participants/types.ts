import { MentionType } from "../comments/types";
import { Role as UserRole } from "../users/types";

export interface Participant {
  type: MentionType;
  id: string;
  displayName: string;
  role: UserRole | null;
  userId: string | null;
}

export interface ParticipantRow {
  type: MentionType;
  id: string;
  display_name: string;
  role: UserRole | null;
  user_id: string | null;
}
