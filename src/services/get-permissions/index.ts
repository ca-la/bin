import * as CollaboratorsDAO from '../../components/collaborators/dao';
import Collaborator from '../../components/collaborators/domain-objects/collaborator';
import * as CollectionsDAO from '../../dao/collections';
import * as DesignEventsDAO from '../../dao/design-events';
import ProductDesign = require('../../domain-objects/product-design');
import Collection from '../../domain-objects/collection';

export interface Permissions {
  canComment: boolean;
  canDelete: boolean;
  canEdit: boolean;
  canEditVariants: boolean;
  canSubmit: boolean;
  canView: boolean;
}

export interface PermissionsAndRole {
  permissions: Permissions;
  role?: string;
}

interface LocalRoles {
  isAdmin: boolean;
  isEditor: boolean;
  isOwner: boolean;
  isPartner: boolean;
  isPreviewer: boolean;
  isViewer: boolean;
}

const ROLE_ORDERING = ['EDIT', 'PARTNER', 'VIEW', 'PREVIEW'];

/**
 * Given a design and a session, returns the permissions for the session on the design.
 * Permissions are based off at least one of the following:
 * - Ownership of the design
 * - Ownership of a collection that the design resides in
 * - Having a collaborator connected to either the design or a collection that the design
 *   resides in.
 */
export async function getDesignPermissionsAndRole(
  design: ProductDesign,
  sessionRole: string,
  sessionUserId: string
): Promise<PermissionsAndRole> {
  const isAdmin = sessionRole === 'ADMIN';
  const isDesignOwner = sessionUserId === design.userId;

  const collections = await CollectionsDAO.findByDesign(design.id);
  const userCreatedCollection = collections.find(
    (collection: Collection): boolean => {
      return collection.createdBy === sessionUserId;
    }
  );
  const isOwner = isDesignOwner || Boolean(userCreatedCollection);

  const combinedCollaborators = await CollaboratorsDAO.findAllForUserThroughDesign(
    design.id,
    sessionUserId
  );
  const roles = combinedCollaborators.map(
    (collaborator: Collaborator): string => {
      return collaborator.role;
    }
  );
  const role = findMostPermissiveRole(roles);

  const isEditor = role === 'EDIT';
  const isPartner = role === 'PARTNER';
  const isPreviewer = role === 'PREVIEW';
  const isViewer = role === 'VIEW';

  return {
    permissions: await getPermissionsFromRoleAndDesignId(
      {
        isAdmin,
        isEditor,
        isOwner,
        isPartner,
        isPreviewer,
        isViewer
      },
      design.id
    ),
    role
  };
}

export async function getDesignPermissions(
  design: ProductDesign,
  sessionRole: string,
  sessionUserId: string
): Promise<Permissions> {
  const designPermissionsAndRole = await getDesignPermissionsAndRole(
    design,
    sessionRole,
    sessionUserId
  );
  return { ...designPermissionsAndRole.permissions };
}

export async function getCollectionPermissions(
  collection: Collection,
  sessionRole: string,
  sessionUserId: string
): Promise<Permissions> {
  const collaborators: Collaborator[] = await CollaboratorsDAO.findByCollectionAndUser(
    collection.id,
    sessionUserId
  );
  const role = findMostPermissiveRole(
    collaborators.map(
      (collaborator: Collaborator): string => {
        return collaborator.role;
      }
    )
  );

  const isOwner = sessionUserId === collection.createdBy;
  const isAdmin = sessionRole === 'ADMIN';
  const isEditor = role === 'EDIT';
  const isPartner = role === 'PARTNER';
  const isPreviewer = role === 'PREVIEW';
  const isViewer = role === 'VIEW';

  return getPermissionsFromRoleAndDesignId({
    isAdmin,
    isEditor,
    isOwner,
    isPartner,
    isPreviewer,
    isViewer
  });
}

async function getPermissionsFromRoleAndDesignId(
  roles: LocalRoles,
  designId?: string
): Promise<Permissions> {
  const isVariantsEditable = designId
    ? await DesignEventsDAO.canEditVariants(designId)
    : false;

  if (roles.isAdmin) {
    return {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true
    };
  }

  if (roles.isOwner) {
    return {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditVariants: isVariantsEditable,
      canSubmit: true,
      canView: true
    };
  }

  if (roles.isEditor) {
    return {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditVariants: isVariantsEditable,
      canSubmit: true,
      canView: true
    };
  }

  if (roles.isPartner) {
    return {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditVariants: false,
      canSubmit: false,
      canView: true
    };
  }

  if (roles.isPreviewer) {
    return {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canEditVariants: false,
      canSubmit: false,
      canView: true
    };
  }

  if (roles.isViewer) {
    return {
      canComment: true,
      canDelete: false,
      canEdit: false,
      canEditVariants: false,
      canSubmit: false,
      canView: true
    };
  }

  return {
    canComment: false,
    canDelete: false,
    canEdit: false,
    canEditVariants: false,
    canSubmit: false,
    canView: false
  };
}

// TODO use collaborators role when that gets added.
export function findMostPermissiveRole(roles: string[]): string | undefined {
  const roleIndex = roles.reduce((acc: number, role: string): number => {
    const index = ROLE_ORDERING.findIndex(
      (roleOrdering: string): boolean => roleOrdering === role
    );
    if (acc >= 0 && index >= 0) {
      return acc < index ? acc : index;
    }
    return index;
  }, -1);

  return ROLE_ORDERING[roleIndex];
}
