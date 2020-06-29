import User, { UserRow } from "../users/types";

export default interface Collaborator {
  id: string;
  collectionId: string | null;
  designId: string | null;
  userId: string | null;
  userEmail: string | null;
  invitationMessage: string;
  role: Roles;
  createdAt: Date;
  deletedAt: Date | null;
  cancelledAt: Date | null;
}

export interface CollaboratorWithUser extends Collaborator {
  user: User | null;
}

export interface CollaboratorRow {
  id: string;
  collection_id: string | null;
  design_id: string | null;
  user_id: string | null;
  user_email: string | null;
  invitation_message: string;
  role: string;
  created_at: string;
  deleted_at: string | null;
  cancelled_at: string | null;
}

export interface CollaboratorWithUserRow extends CollaboratorRow {
  user: UserRow | null;
}

export type Roles = "EDIT" | "VIEW" | "PARTNER" | "PREVIEW";

export function isRole(role: string): role is Roles {
  const roles = ["EDIT", "VIEW", "PARTNER", "PREVIEW"];
  if (roles.includes(role)) {
    return true;
  }
  return false;
}
