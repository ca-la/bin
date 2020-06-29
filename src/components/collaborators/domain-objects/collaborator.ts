import DataAdapter from "../../../services/data-adapter";
import { hasProperties } from "../../../services/require-properties";
import toDateOrNull from "../../../services/to-date";
import { encode as encodeUser } from "../../users/domain-object";
import Collaborator, {
  Roles,
  CollaboratorWithUserRow,
  CollaboratorWithUser,
  CollaboratorRow,
} from "../types";

export const UPDATABLE_PROPERTIES = [
  "cancelled_at",
  "user_email",
  "user_id",
  "role",
];

export const encode = (data: CollaboratorWithUserRow): CollaboratorWithUser => {
  let user = null;
  if (data.user) {
    user = encodeUser(data.user);
  }
  return {
    cancelledAt: toDateOrNull(data.cancelled_at),
    collectionId: data.collection_id,
    createdAt: new Date(data.created_at),
    deletedAt: toDateOrNull(data.deleted_at),
    designId: data.design_id,
    id: data.id,
    invitationMessage: data.invitation_message,
    role: data.role as Roles,
    user,
    userEmail: data.user_email,
    userId: data.user_id,
  };
};

export const dataAdapter = new DataAdapter<CollaboratorRow, Collaborator>();
export const dataWithUserAdapter = new DataAdapter<
  CollaboratorWithUserRow,
  CollaboratorWithUser
>(encode);
export const partialDataAdapter = new DataAdapter<
  Partial<CollaboratorRow>,
  Partial<Collaborator>
>();

export function isCollaboratorRow(row: object): row is CollaboratorRow {
  return hasProperties(
    row,
    "id",
    "collection_id",
    "design_id",
    "user_id",
    "user_email",
    "invitation_message",
    "role",
    "created_at",
    "deleted_at",
    "cancelled_at"
  );
}

export function isCollaboratorWithUserRow(
  row: object
): row is CollaboratorWithUserRow {
  return hasProperties(
    row,
    "id",
    "collection_id",
    "design_id",
    "user_id",
    "user_email",
    "invitation_message",
    "role",
    "created_at",
    "deleted_at",
    "user"
  );
}
