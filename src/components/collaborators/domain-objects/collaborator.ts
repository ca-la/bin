import DataAdapter from '../../../services/data-adapter';
import { hasProperties } from '../../../services/require-properties';
import User = require('../../../domain-objects/user');

export const UPDATABLE_PROPERTIES = [
  'user_email',
  'user_id',
  'role'
];

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
}

export interface CollaboratorWithUser extends Collaborator {
  user?: User;
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
}

export type Roles = 'EDIT' | 'VIEW' | 'PARTNER' | 'PREVIEW';
export function isRole(role: string): role is Roles {
  const roles = ['EDIT', 'VIEW', 'PARTNER', 'PREVIEW'];
  if (roles.includes(role)) {
    return true;
  }
  return false;
}

export const dataAdapter = new DataAdapter<CollaboratorRow, Collaborator>();
export const partialDataAdapter =
  new DataAdapter<Partial<CollaboratorRow>, Partial<Collaborator>>();

export function isCollaboratorRow(row: object): row is CollaboratorRow {
  return hasProperties(
    row,
    'id',
    'collection_id',
    'design_id',
    'user_id',
    'user_email',
    'invitation_message',
    'role',
    'created_at',
    'deleted_at'
  );
}
