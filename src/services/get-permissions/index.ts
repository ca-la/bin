import Knex from "knex";
import { mergeWith } from "lodash";
import db from "../db";

import * as CollaboratorsDAO from "../../components/collaborators/dao";
import Collaborator, {
  CollaboratorRoles,
  Roles as CollaboratorRolesType,
} from "../../components/collaborators/types";
import * as CollectionsDAO from "../../components/collections/dao";
import * as ProductDesignsDAO from "../../components/product-designs/dao";
import { isQuoteCommitted } from "../../components/design-events/service";
import CollectionDb from "../../components/collections/domain-object";
import { Permissions } from "../../components/permissions/types";
import { TeamUser, TeamUsersDAO } from "../../components/team-users";
import {
  TEAM_USER_ROLE_TO_COLLABORATOR_ROLE,
  Role as TeamUserRole,
} from "../../components/team-users/types";

export { Permissions };

export interface PermissionsAndRole {
  permissions: Permissions;
  role: string | null;
}

const ROLE_ORDERING = ["OWNER", "EDIT", "PARTNER", "VIEW", "PREVIEW"];

export const FULL_ACCESS: Permissions = {
  canComment: true,
  canDelete: true,
  canEdit: true,
  canEditTitle: true,
  canEditVariants: true,
  canSubmit: true,
  canView: true,
};

const NO_ACCESS: Permissions = {
  canComment: false,
  canDelete: false,
  canEdit: false,
  canEditTitle: false,
  canEditVariants: false,
  canSubmit: false,
  canView: false,
};

export const ADMIN_PERMISSIONS: Permissions = FULL_ACCESS;

const COLLABORATOR_PERMISSIONS: Record<CollaboratorRolesType, Permissions> = {
  [CollaboratorRoles.OWNER]: {
    canComment: true,
    canDelete: false,
    canEdit: true,
    canEditTitle: true,
    canEditVariants: true,
    canSubmit: true,
    canView: true,
  },
  [CollaboratorRoles.EDIT]: {
    canComment: true,
    canDelete: false,
    canEdit: true,
    canEditTitle: true,
    canEditVariants: true,
    canSubmit: true,
    canView: true,
  },
  [CollaboratorRoles.PARTNER]: {
    canComment: true,
    canDelete: false,
    canEdit: true,
    canEditTitle: false,
    canEditVariants: false,
    canSubmit: false,
    canView: true,
  },
  [CollaboratorRoles.VIEW]: {
    canComment: true,
    canDelete: false,
    canEdit: false,
    canEditTitle: false,
    canEditVariants: false,
    canSubmit: false,
    canView: true,
  },
  [CollaboratorRoles.PREVIEW]: {
    canComment: false,
    canDelete: false,
    canEdit: false,
    canEditTitle: false,
    canEditVariants: false,
    canSubmit: false,
    canView: true,
  },
};

const TEAM_USER_PERMISSIONS: Record<TeamUserRole, Permissions> = {
  [TeamUserRole.OWNER]: FULL_ACCESS,
  [TeamUserRole.ADMIN]: FULL_ACCESS,
  [TeamUserRole.EDITOR]: FULL_ACCESS,
  [TeamUserRole.VIEWER]: {
    canComment: true,
    canDelete: false,
    canEdit: false,
    canEditTitle: false,
    canEditVariants: false,
    canSubmit: false,
    canView: true,
  },
  [TeamUserRole.TEAM_PARTNER]: COLLABORATOR_PERMISSIONS.PARTNER,
};

const PERMISSIONS_MODIFIERS: Record<string, Partial<Permissions>> = {
  CHECKED_OUT_DESIGN: {
    canEditVariants: false,
  },
  OWNER_OF_DRAFT_DESIGN: FULL_ACCESS,
};

export const mergePermissionsOR = (
  permissionsA: Permissions,
  permissionsB: Partial<Permissions>
): Permissions =>
  mergeWith(
    { ...permissionsA },
    permissionsB,
    (aValue: boolean, bValue: boolean | undefined): boolean =>
      aValue || Boolean(bValue)
  );

export const mergePermissionsAND = (
  permissionsA: Permissions,
  permissionsB: Partial<Permissions>
): Permissions =>
  mergeWith(
    { ...permissionsA },
    permissionsB,
    (aValue: boolean, bValue: boolean | undefined): boolean =>
      aValue && Boolean(bValue)
  );

export function mergeRolesPermissions<RoleType extends string>(
  roles: RoleType[],
  rolePermissions: Record<RoleType, Permissions>
): Permissions {
  const permissions = roles.reduce(
    (permissionsAcc: Permissions, role: RoleType) => {
      return mergePermissionsOR(permissionsAcc, rolePermissions[role]);
    },
    NO_ACCESS
  );

  return permissions;
}

export async function getDesignPermissionsAndRole(
  ktx: Knex,
  options: {
    designId: string;
    sessionRole: string;
    sessionUserId: string;
    isDraft?: boolean;
  }
): Promise<PermissionsAndRole> {
  const { designId, sessionRole, sessionUserId } = options;

  if (sessionRole === "ADMIN") {
    return {
      role: CollaboratorRoles.EDIT,
      permissions: ADMIN_PERMISSIONS,
    };
  }

  const combinedCollaborators = await CollaboratorsDAO.findAllForUserThroughDesign(
    designId,
    sessionUserId,
    ktx
  );
  const collaboratorRoles = combinedCollaborators.map(
    (collaborator: Collaborator) => {
      return collaborator.role;
    }
  );
  const teamUsers = await TeamUsersDAO.findByUserAndDesign(
    ktx,
    sessionUserId,
    designId
  );
  const teamUserRoles = teamUsers.map((teamUser: TeamUser) => {
    return teamUser.role;
  });

  const role = findMostPermissiveRole([...collaboratorRoles, ...teamUserRoles]);

  const isOwner = await CollectionsDAO.hasOwnership({
    designId,
    userId: sessionUserId,
    ktx,
  });

  const isCheckedOut = await isQuoteCommitted(ktx, designId);

  let isDraft = options.isDraft;
  if (isDraft === undefined) {
    const design = await ProductDesignsDAO.findById(
      designId,
      null,
      undefined,
      ktx
    );
    if (design) {
      isDraft = design.collectionIds.length === 0;
    }
  }

  return {
    role,
    permissions: calculateDesignPermissions({
      sessionRole,
      collaboratorRoles,
      teamUserRoles,
      isOwner,
      isDesignCheckedOut: isCheckedOut,
      isDraftDesign: isDraft,
    }),
  };
}

export async function getDesignPermissions(options: {
  designId: string;
  sessionRole: string;
  sessionUserId: string;
  trx?: Knex.Transaction;
}): Promise<Permissions> {
  if (options.trx) {
    const designPermissionsAndRole = await getDesignPermissionsAndRole(
      options.trx,
      options
    );
    return { ...designPermissionsAndRole.permissions };
  }

  return db.transaction(async (trx: Knex.Transaction) => {
    const designPermissionsAndRole = await getDesignPermissionsAndRole(
      trx,
      options
    );
    return { ...designPermissionsAndRole.permissions };
  });
}

async function getCollectionCollaboratorRoles(
  ktx: Knex,
  collection: CollectionDb,
  sessionUserId: string
) {
  const collaborators: Collaborator[] = await CollaboratorsDAO.findByCollectionAndUser(
    collection.id,
    sessionUserId,
    ktx
  );
  const collaboratorRoles = collaborators.map((collaborator: Collaborator) => {
    return collaborator.role;
  });

  // For legacy collections with no "EDIT" collaborator for creator
  if (sessionUserId === collection.createdBy) {
    collaboratorRoles.push(CollaboratorRoles.EDIT);
  }

  return collaboratorRoles;
}

async function getCollectionTeamRoles(
  ktx: Knex,
  collectionId: string,
  sessionUserId: string
) {
  const teamUsers = await TeamUsersDAO.findByUserAndCollection(
    ktx,
    sessionUserId,
    collectionId
  );

  const teamUserRoles = teamUsers.map(
    (teamUser: TeamUser): TeamUserRole => {
      return teamUser.role;
    }
  );

  return teamUserRoles;
}

export function calculateCollectionPermissions({
  collection,
  sessionRole,
  sessionUserId,
  collaboratorRoles,
  teamUserRoles,
}: {
  collection: CollectionDb;
  sessionRole: string;
  sessionUserId: string;
  collaboratorRoles: CollaboratorRolesType[];
  teamUserRoles: TeamUserRole[];
}) {
  return calculateDesignPermissions({
    sessionRole,
    collaboratorRoles,
    teamUserRoles,
    isOwner: collection.createdBy === sessionUserId,
    isDesignCheckedOut: false,
  });
}

export function calculateDesignPermissions(options: {
  sessionRole: string;
  isOwner: boolean;
  collaboratorRoles: CollaboratorRolesType[];
  teamUserRoles: TeamUserRole[];
  isDesignCheckedOut?: boolean;
  isDraftDesign?: boolean;
}) {
  if (options.sessionRole === "ADMIN") {
    return ADMIN_PERMISSIONS;
  }

  const collaboratorRoles: CollaboratorRolesType[] = [
    ...options.collaboratorRoles,
  ];

  // For legacy collections/design with no "OWNER" collaborator for creator
  if (options.isOwner) {
    collaboratorRoles.push("OWNER");
  }

  for (const teamUserRole of options.teamUserRoles) {
    const collaboratorRole = TEAM_USER_ROLE_TO_COLLABORATOR_ROLE[teamUserRole];
    if (!collaboratorRole) {
      throw new Error(`Missing team role mapping for "${teamUserRole}"`);
    }
    collaboratorRoles.push(collaboratorRole);
  }

  const collaboratorPermissions = mergeRolesPermissions<CollaboratorRolesType>(
    collaboratorRoles,
    COLLABORATOR_PERMISSIONS
  );

  const teamUserPermissions = mergeRolesPermissions<TeamUserRole>(
    options.teamUserRoles,
    TEAM_USER_PERMISSIONS
  );

  let userPermissions = mergePermissionsOR(
    collaboratorPermissions,
    teamUserPermissions
  );

  const isOwnerOfTheDraftDesign = Boolean(
    options.isDraftDesign &&
      collaboratorRoles.findIndex(
        (role: CollaboratorRolesType) => role === CollaboratorRoles.OWNER
      ) !== -1
  );

  if (isOwnerOfTheDraftDesign) {
    userPermissions = mergePermissionsOR(
      userPermissions,
      PERMISSIONS_MODIFIERS.OWNER_OF_DRAFT_DESIGN
    );
  }

  if (options.isDesignCheckedOut) {
    userPermissions = mergePermissionsAND(
      userPermissions,
      PERMISSIONS_MODIFIERS.CHECKED_OUT_DESIGN
    );
  }

  return userPermissions;
}

export async function getCollectionPermissions(
  ktx: Knex,
  collection: CollectionDb,
  sessionRole: string,
  sessionUserId: string
): Promise<Permissions> {
  if (sessionRole === "ADMIN") {
    return ADMIN_PERMISSIONS;
  }

  const collaboratorRoles = await getCollectionCollaboratorRoles(
    ktx,
    collection,
    sessionUserId
  );
  const teamUserRoles = await getCollectionTeamRoles(
    ktx,
    collection.id,
    sessionUserId
  );

  return calculateCollectionPermissions({
    collection,
    sessionRole,
    sessionUserId,
    collaboratorRoles,
    teamUserRoles,
  });
}

export function calculateTeamCollectionPermissions(
  roleOrRoles: TeamUserRole | TeamUserRole[]
): Permissions {
  const teamRoles: TeamUserRole[] = Array.isArray(roleOrRoles)
    ? roleOrRoles
    : [roleOrRoles];

  const teamUserPermissions = mergeRolesPermissions<TeamUserRole>(
    teamRoles,
    TEAM_USER_PERMISSIONS
  );

  return teamUserPermissions;
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
    return NO_ACCESS;
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
