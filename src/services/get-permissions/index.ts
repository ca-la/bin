import * as CollaboratorsDAO from '../../dao/collaborators';
import { Collaborator } from '../../domain-objects/collaborator';
import ProductDesign = require('../../domain-objects/product-design');
import Collection from '../../domain-objects/collection';

interface ProductDesignWithRole extends ProductDesign {
  role: string;
}

export interface Permissions {
  canComment: boolean;
  canDelete: boolean;
  canEdit: boolean;
  canManagePricing: boolean;
  canModifyServices: boolean;
  canSubmit: boolean;
  canView: boolean;
  canViewPricing: boolean;
}

export async function attachRoleOnDesign(
  requestorId: string,
  design: ProductDesign
): Promise<ProductDesign | ProductDesignWithRole> {
  const requestorAsCollaborator: Collaborator[] = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    requestorId
  );

  if (requestorAsCollaborator.length > 0) {
    return { ...design, role: requestorAsCollaborator[0].role };
  }

  return design;
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
  const collaborator = collaborators[0] || {};

  const isOwner = sessionUserId === collection.createdBy;
  const isAdmin = sessionRole === 'ADMIN';

  const isEditor = collaborator.role === 'EDIT';
  const isCommenter = collaborator.role === 'COMMENT';
  const isViewer = collaborator.role === 'VIEW';

  if (isOwner || isAdmin) {
    return {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canManagePricing: true,
      canModifyServices: true,
      canSubmit: true,
      canView: true,
      canViewPricing: true
    };
  }

  if (isEditor) {
    return {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canManagePricing: false,
      canModifyServices: false,
      canSubmit: false,
      canView: true,
      canViewPricing: false
    };
  }

  if (isCommenter) {
    return {
      canComment: true,
      canDelete: false,
      canEdit: false,
      canManagePricing: false,
      canModifyServices: false,
      canSubmit: false,
      canView: true,
      canViewPricing: false
    };
  }

  if (isViewer) {
    return {
      canComment: false,
      canDelete: false,
      canEdit: false,
      canManagePricing: false,
      canModifyServices: false,
      canSubmit: false,
      canView: true,
      canViewPricing: false
    };
  }

  return {
    canComment: false,
    canDelete: false,
    canEdit: false,
    canManagePricing: false,
    canModifyServices: false,
    canSubmit: false,
    canView: false,
    canViewPricing: false
  };
}
