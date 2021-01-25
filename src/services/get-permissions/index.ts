import Knex from "knex";
import db from "../db";

import * as CollaboratorsDAO from "../../components/collaborators/dao";
import Collaborator, { Roles } from "../../components/collaborators/types";
import * as CollectionsDAO from "../../components/collections/dao";
import { isQuoteCommitted } from "../../components/design-events/service";
import CollectionDb from "../../components/collections/domain-object";
import { Permissions } from "../../components/permissions/types";
import { TeamUserRole, TeamUsersDAO } from "../../components/team-users";
export { Permissions } from "../../components/permissions/types";

export interface PermissionsAndRole {
  permissions: Permissions;
  role: string | null;
}

const ROLE_ORDERING = ["EDIT", "PARTNER", "VIEW", "PREVIEW"];

const TEAM_USER_ROLE_TO_COLLABORATOR_ROLE: Record<TeamUserRole, Roles> = {
  [TeamUserRole.OWNER]: "EDIT",
  [TeamUserRole.ADMIN]: "EDIT",
  [TeamUserRole.EDITOR]: "EDIT",
  [TeamUserRole.VIEWER]: "VIEW",
};

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

export async function getDesignPermissionsAndRole(
  trx: Knex.Transaction,
  options: {
    designId: string;
    sessionRole: string;
    sessionUserId: string;
  }
): Promise<PermissionsAndRole> {
  const { designId, sessionRole, sessionUserId } = options;

  const combinedCollaborators = await CollaboratorsDAO.findAllForUserThroughDesign(
    designId,
    sessionUserId,
    trx
  );
  const collaboratorRoles = combinedCollaborators.map(
    (collaborator: Collaborator): string => {
      return collaborator.role;
    }
  );
  const teamUsers = await TeamUsersDAO.findByUserAndDesign(
    trx,
    sessionUserId,
    designId
  );

  const teamUserRoles = teamUsers.map((teamUser: { role: string }): string => {
    return teamUser.role;
  });
  for (const teamUser of teamUsers) {
    const collaboratorRole = TEAM_USER_ROLE_TO_COLLABORATOR_ROLE[teamUser.role];
    if (!collaboratorRole) {
      throw new Error(`Missing team role mapping for "${teamUser.role}"`);
    }
    collaboratorRoles.push(collaboratorRole);
  }

  const role = findMostPermissiveRole([...collaboratorRoles, ...teamUserRoles]);
  if (sessionRole === "ADMIN") {
    return {
      role,
      permissions: ADMIN_PERMISSIONS,
    };
  }

  const isOwner = await CollectionsDAO.hasOwnership({
    designId,
    userId: sessionUserId,
    trx,
  });

  // For legacy designs with no "EDIT" collaborator for creator
  if (isOwner) {
    collaboratorRoles.push("EDIT");
  }
  const isCheckedOut = await isQuoteCommitted(trx, designId);

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
  return db.transaction(async (trx: Knex.Transaction) => {
    const designPermissionsAndRole = await getDesignPermissionsAndRole(
      trx,
      options
    );
    return { ...designPermissionsAndRole.permissions };
  });
}

export async function getCollectionPermissions(
  trx: Knex.Transaction,
  collection: CollectionDb,
  sessionRole: string,
  sessionUserId: string
): Promise<Permissions> {
  if (collection.teamId !== null) {
    return getTeamCollectionPermissions(
      trx,
      collection.teamId,
      sessionUserId,
      sessionRole
    );
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
  userId: string,
  sessionRole: string
): Promise<Permissions> {
  if (sessionRole === "ADMIN") {
    return ADMIN_PERMISSIONS;
  }

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
