import { Role as UserRole } from "@cala/ts-lib/dist/users";

import DataAdapter from "../../../services/data-adapter";
import { hasProperties } from "../../../services/require-properties";
import { isCollaboratorRow } from "./collaborator";
import Collaborator, { CollaboratorRow, isRole } from "../types";

export interface UserMeta {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
  return (
    hasProperties(row, "design_id", "collaborators") &&
    row.collaborators.reduce((acc: boolean, collaborator: any): boolean => {
      return acc && isCollaboratorRow(collaborator);
    }, true)
  );
}

function encode(
  row: CollaboratorWithUserMetaByDesignRow
): CollaboratorWithUserMetaByDesign {
  return {
    collaborators: row.collaborators.map(
      (collaborator: CollaboratorWithUserMetaRow) => {
        if (!isRole(collaborator.role)) {
          throw new Error(
            `Collaborator ${collaborator.id} has an invalid role!`
          );
        }

        return {
          cancelledAt: collaborator.cancelled_at
            ? new Date(collaborator.cancelled_at)
            : null,
          collectionId: collaborator.collection_id,
          createdAt: new Date(collaborator.created_at),
          deletedAt: collaborator.deleted_at
            ? new Date(collaborator.deleted_at)
            : null,
          designId: collaborator.design_id,
          id: collaborator.id,
          invitationMessage: collaborator.invitation_message,
          role: collaborator.role,
          user: collaborator.user
            ? {
                email: collaborator.user.email,
                id: collaborator.user.id,
                name: collaborator.user.name,
                role: collaborator.user.role,
              }
            : null,
          userEmail: collaborator.user_email,
          userId: collaborator.user_id,
          teamId: collaborator.team_id,
        };
      }
    ),
    designId: row.design_id,
  };
}

function decode(
  data: CollaboratorWithUserMetaByDesign
): CollaboratorWithUserMetaByDesignRow {
  return {
    collaborators: data.collaborators.map(
      (collaborator: CollaboratorWithUserMeta) => {
        if (!isRole(collaborator.role)) {
          throw new Error(
            `Collaborator ${collaborator.id} has an invalid role!`
          );
        }

        return {
          cancelled_at: collaborator.cancelledAt
            ? new Date(collaborator.cancelledAt).toISOString()
            : null,
          collection_id: collaborator.collectionId,
          created_at: new Date(collaborator.createdAt).toISOString(),
          deleted_at: collaborator.deletedAt
            ? new Date(collaborator.deletedAt).toISOString()
            : null,
          design_id: collaborator.designId,
          id: collaborator.id,
          invitation_message: collaborator.invitationMessage,
          role: collaborator.role,
          user: collaborator.user
            ? {
                email: collaborator.user.email,
                id: collaborator.user.id,
                name: collaborator.user.name,
                role: collaborator.user.role,
              }
            : null,
          user_email: collaborator.userEmail,
          user_id: collaborator.userId,
          team_id: collaborator.teamId,
        };
      }
    ),
    design_id: data.designId,
  };
}

export const dataAdapterByDesign = new DataAdapter<
  CollaboratorWithUserMetaByDesignRow,
  CollaboratorWithUserMetaByDesign
>(encode, decode);
