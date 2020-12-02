import { MentionType } from "../comments/types";
import { Role as UserRole } from "../users/types";
import { BidTaskTypeId } from "../bid-task-types/types";

export interface Participant {
  type: MentionType;
  id: string;
  displayName: string;
  role: UserRole | null;
  bidTaskTypes: string[];
  userId: string | null;
}

export interface ParticipantRow {
  type: MentionType;
  id: string;
  display_name: string;
  role: UserRole | null;
  bid_task_type_ids: BidTaskTypeId[];
  user_id: string | null;
}
