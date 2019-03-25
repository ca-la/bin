import * as CollaboratorsDAO from '../../components/collaborators/dao';
import Collaborator from '../../components/collaborators/domain-objects/collaborator';
import * as CollectionsDAO from '../../dao/collections';
import ProductDesign = require('../../domain-objects/product-design');
import Collection from '../../domain-objects/collection';

export interface Permissions {
  canComment: boolean;
  canDelete: boolean;
  canEdit: boolean;
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

// TODO: This is deprecated and should be removed once Studio only consumes the `permissions`
//       object.
export async function getDesignPermissionsAndRole(
  design: ProductDesign,
  sessionRole: string,
  sessionUserId: string
): Promise<PermissionsAndRole> {
  const isAdmin = sessionRole === 'ADMIN';
  const isDesignOwner = sessionUserId === design.userId;
  const collections = await CollectionsDAO.findByDesign(design.id);
  const userCreatedCollection = collections.find((collection: Collection): boolean => {
    return collection.createdBy === sessionUserId;
  });
  const isOwner = isDesignOwner || Boolean(userCreatedCollection);

  const designCollaborator = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    sessionUserId
  );
  const collaboratorsForEachCollection: Collaborator[][] = await Promise.all(
    collections.map(async (collection: Collection): Promise<Collaborator[]> => {
      return CollaboratorsDAO.findByCollectionAndUser(
        collection.id,
        sessionUserId
      );
    })
  );
  const collectionCollaborators: Collaborator[] = collaboratorsForEachCollection.reduce(
    (acc: Collaborator[], collaborators: Collaborator[]): Collaborator[] => {
      return [...collaborators, ...acc];
    }, []
  );
  const combinedCollaborators: Collaborator[] = designCollaborator
    ? [designCollaborator, ...collectionCollaborators]
    : collectionCollaborators;
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
    permissions: getPermissionsFromRole({
      isAdmin,
      isEditor,
      isOwner,
      isPartner,
      isPreviewer,
      isViewer
    }),
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
  const role = findMostPermissiveRole(collaborators.map((collaborator: Collaborator): string => {
    return collaborator.role;
  }));

  const isOwner = sessionUserId === collection.createdBy;
  const isAdmin = sessionRole === 'ADMIN';
  const isEditor = role === 'EDIT';
  const isPartner = role === 'PARTNER';
  const isPreviewer = role === 'PREVIEW';
  const isViewer = role === 'VIEW';

  return getPermissionsFromRole({
    isAdmin,
    isEditor,
    isOwner,
    isPartner,
    isPreviewer,
    isViewer
  });
}

function getPermissionsFromRole(roles: LocalRoles): Permissions {
  if (roles.isOwner || roles.isAdmin) {
    return {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canSubmit: true,
      canView: true
    };
  }

  if (roles.isEditor) {
    return {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canSubmit: true,
      canView: true
    };
  }

  if (roles.isPartner) {
    return {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canSubmit: false,
      canView: true
    };
  }

  if (roles.isPreviewer) {
    return {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canSubmit: false,
      canView: true
    };
  }

  if (roles.isViewer) {
    return {
      canComment: true,
      canDelete: false,
      canEdit: false,
      canSubmit: false,
      canView: true
    };
  }

  return {
    canComment: false,
    canDelete: false,
    canEdit: false,
    canSubmit: false,
    canView: false
  };
}

// TODO use collaborators role when that gets added.
export function findMostPermissiveRole(roles: string[]): string | undefined {
  const roleIndex = roles.reduce((acc: number, role: string): number => {
    const index = ROLE_ORDERING.findIndex((roleOrdering: string): boolean => roleOrdering === role);
    if (acc >= 0 && index >= 0) { return acc < index ? acc : index; }
    return index;
  }, -1);

  return ROLE_ORDERING[roleIndex];
}
