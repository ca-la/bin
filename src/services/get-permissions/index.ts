import Knex from "knex";

import * as CollaboratorsDAO from "../../components/collaborators/dao";
import Collaborator from "../../components/collaborators/types";
import * as CollectionsDAO from "../../components/collections/dao";
import { isQuoteCommitted } from "../../components/design-events/service";
import CollectionDb from "../../components/collections/domain-object";
import { isOwner as isDesignOwner } from "../../components/product-designs/dao/dao";
import { Permissions } from "../../components/permissions/types";
import TeamUsersDAO from "../../components/team-users/dao";
import { Role as TeamUserRole } from "../../components/team-users/types";
export { Permissions } from "../../components/permissions/types";

export interface PermissionsAndRole {
  permissions: Permissions;
  role: string | null;
}

const ROLE_ORDERING = ["EDIT", "PARTNER", "VIEW", "PREVIEW"];

const ADMIN_PERMISSIONS: Permissions = {
  canComment: true,
  canDelete: true,
  canEdit: true,
  canEditVariants: true,
  canSubmit: true,
  canView: true,
};

export function getPermissionsFromDesign(options: {
  collaboratorRoles: string[];
  isCheckedOut: boolean;
  sessionRole: string;
  sessionUserId: string;
}): Permissions {
  if (options.sessionRole === "ADMIN") {
    return ADMIN_PERMISSIONS;
  }

  const role = findMostPermissiveRole(options.collaboratorRoles);

  if (role === "EDIT") {
    return {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditVariants: !options.isCheckedOut,
      canSubmit: true,
      canView: true,
    };
  }

  if (role === "PARTNER") {
    return {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditVariants: false,
      canSubmit: false,
      canView: true,
    };
  }

  if (role === "PREVIEW") {
    return {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canEditVariants: false,
      canSubmit: false,
      canView: true,
    };
  }

  if (role === "VIEW") {
    return {
      canComment: true,
      canDelete: false,
      canEdit: false,
      canEditVariants: false,
      canSubmit: false,
      canView: true,
    };
  }

  return {
    canComment: false,
    canDelete: false,
    canEdit: false,
    canEditVariants: false,
    canSubmit: false,
    canView: false,
  };
}

export async function getDesignPermissionsAndRole(options: {
  designId: string;
  sessionRole: string;
  sessionUserId: string;
}): Promise<PermissionsAndRole> {
  const { designId, sessionRole, sessionUserId } = options;

  const combinedCollaborators = await CollaboratorsDAO.findAllForUserThroughDesign(
    designId,
    sessionUserId
  );
  const collaboratorRoles = combinedCollaborators.map(
    (collaborator: Collaborator): string => {
      return collaborator.role;
    }
  );

  const role = findMostPermissiveRole(collaboratorRoles);

  if (sessionRole === "ADMIN") {
    return {
      role,
      permissions: ADMIN_PERMISSIONS,
    };
  }

  const isOwnerOfDesign = await isDesignOwner({
    designId,
    userId: sessionUserId,
  });
  const isOwnerOfCollection = await CollectionsDAO.hasOwnership({
    designId,
    userId: sessionUserId,
  });
  const isOwner = isOwnerOfDesign || isOwnerOfCollection;

  // For legacy designs with no "EDIT" collaborator for creator
  if (isOwner) {
    collaboratorRoles.push("EDIT");
  }
  const isCheckedOut = await isQuoteCommitted(null, designId);

  return {
    role,
    permissions: getPermissionsFromDesign({
      collaboratorRoles,
      isCheckedOut,
      sessionRole,
      sessionUserId,
    }),
  };
}

export async function getDesignPermissions(options: {
  designId: string;
  sessionRole: string;
  sessionUserId: string;
}): Promise<Permissions> {
  const designPermissionsAndRole = await getDesignPermissionsAndRole(options);
  return { ...designPermissionsAndRole.permissions };
}

export async function getCollectionPermissions(
  trx: Knex.Transaction,
  collection: CollectionDb,
  sessionRole: string,
  sessionUserId: string
): Promise<Permissions> {
  if (collection.teamId !== null) {
    return getTeamCollectionPermissions(trx, collection.teamId, sessionUserId);
  }
  const collaborators: Collaborator[] = await CollaboratorsDAO.findByCollectionAndUser(
    collection.id,
    sessionUserId,
    trx
  );
  const collaboratorRoles = collaborators.map(
    (collaborator: Collaborator): string => {
      return collaborator.role;
    }
  );

  // For legacy collections with no "EDIT" collaborator for creator
  if (sessionUserId === collection.createdBy) {
    collaboratorRoles.push("EDIT");
  }

  return getPermissionsFromDesign({
    collaboratorRoles,
    isCheckedOut: true,
    sessionRole,
    sessionUserId,
  });
}

export function calculateTeamCollectionPermissions(
  teamRole: TeamUserRole
): Permissions {
  if (teamRole === TeamUserRole.VIEWER) {
    return {
      canComment: true,
      canDelete: false,
      canEdit: false,
      canEditVariants: false,
      canSubmit: false,
      canView: true,
    };
  }

  return {
    canComment: true,
    canDelete: true,
    canEdit: true,
    canEditVariants: true,
    canSubmit: true,
    canView: true,
  };
}

export async function getTeamCollectionPermissions(
  trx: Knex.Transaction,
  teamId: string,
  userId: string
): Promise<Permissions> {
  const teamUser = await TeamUsersDAO.findOne(trx, { teamId, userId });
  if (!teamUser) {
    return {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canEditVariants: false,
      canSubmit: false,
      canView: false,
    };
  }

  return calculateTeamCollectionPermissions(teamUser.role);
}

// TODO use collaborators role when that gets added.
export function findMostPermissiveRole(roles: string[]): string | null {
  const roleIndex = roles.reduce((acc: number, role: string): number => {
    const index = ROLE_ORDERING.findIndex(
      (roleOrdering: string): boolean => roleOrdering === role
    );
    if (acc >= 0 && index >= 0) {
      return acc < index ? acc : index;
    }
    return index;
  }, -1);

  const mostPermissiveRole = ROLE_ORDERING[roleIndex] as string | undefined;

  return mostPermissiveRole === undefined ? null : mostPermissiveRole;
}
