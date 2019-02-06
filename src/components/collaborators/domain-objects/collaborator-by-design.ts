import DataAdapter from '../../../services/data-adapter';
import { hasProperties } from '../../../services/require-properties';
import Collaborator, {
  CollaboratorRow,
  isCollaboratorRow,
  isRole
} from './collaborator';

export interface UserMeta {
  id: string;
  email: string;
  name: string;
}

export interface CollaboratorWithUserMeta extends Collaborator {
  user: UserMeta | null;
}

export interface CollaboratorWithUserMetaByDesign {
  designId: string;
  collaborators: CollaboratorWithUserMeta[];
}

export type CollaboratorWithUserMetaRow = CollaboratorRow & {
  user: UserMeta | null;
};

export interface CollaboratorWithUserMetaByDesignRow {
  design_id: string;
  collaborators: CollaboratorWithUserMetaRow[];
}

export function isCollaboratorWithUserMetaByDesignRow(
  row: any
): row is CollaboratorWithUserMetaByDesignRow {
  return hasProperties(
    row,
    'design_id',
    'collaborators'
  ) && row.collaborators.reduce((acc: boolean, collaborator: any): boolean => {
    return acc && isCollaboratorRow(collaborator);
  }, true);
}

function encode(row: CollaboratorWithUserMetaByDesignRow): CollaboratorWithUserMetaByDesign {
  return {
    collaborators: row.collaborators.map((collaborator: CollaboratorWithUserMetaRow) => {
      if (!isRole(collaborator.role)) {
        throw new Error(`Collaborator ${collaborator.id} has an invalid role!`);
      }

      return {
        collectionId: collaborator.collection_id,
        createdAt: new Date(collaborator.created_at),
        deletedAt: collaborator.deleted_at
          ? new Date(collaborator.deleted_at)
          : null,
        designId: collaborator.design_id,
        id: collaborator.id,
        invitationMessage: collaborator.invitation_message,
        role: collaborator.role,
        user: collaborator.user ? {
          email: collaborator.user.email,
          id: collaborator.user.id,
          name: collaborator.user.name
        } : null,
        userEmail: collaborator.user_email,
        userId: collaborator.user_id
      };
    }),
    designId: row.design_id
  };
}

function decode(data: CollaboratorWithUserMetaByDesign): CollaboratorWithUserMetaByDesignRow {
  return {
    collaborators: data.collaborators.map((collaborator: CollaboratorWithUserMeta) => {
      if (!isRole(collaborator.role)) {
        throw new Error(`Collaborator ${collaborator.id} has an invalid role!`);
      }

      return {
        collection_id: collaborator.collectionId,
        created_at: new Date(collaborator.createdAt).toISOString(),
        deleted_at: collaborator.deletedAt
          ? new Date(collaborator.deletedAt).toISOString()
          : null,
        design_id: collaborator.designId,
        id: collaborator.id,
        invitation_message: collaborator.invitationMessage,
        role: collaborator.role,
        user: collaborator.user ? {
          email: collaborator.user.email,
          id: collaborator.user.id,
          name: collaborator.user.name
        } : null,
        user_email: collaborator.userEmail,
        user_id: collaborator.userId
      };
    }),
    design_id: data.designId
  };
}

export const dataAdapterByDesign = new DataAdapter<
  CollaboratorWithUserMetaByDesignRow,
  CollaboratorWithUserMetaByDesign
>(encode, decode);
