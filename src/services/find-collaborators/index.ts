import CollaboratorsDAO = require('../../components/collaborators/dao');
import CollectionsDAO = require('../../dao/collections');
import ProductDesignsDAO = require('../../dao/product-designs');
import { CALA_OPS_USER_ID } from '../../config';
import Collaborator from '../../components/collaborators/domain-object';

export const COLLABORATOR_ROLES = {
  CALA: 'CALA',
  DESIGNER: 'DESIGNER',
  PARTNER: 'PARTNER'
};

export type CollaboratorRole = keyof typeof COLLABORATOR_ROLES;

export default async function findCollaboratorsByRole(
  designId: string,
  role: CollaboratorRole
): Promise<Collaborator[]> {
  const design = await ProductDesignsDAO.findById(designId);
  if (!design) { throw new Error(`No design found with ID ${designId}`); }

  switch (role) {
    case 'DESIGNER': {
      const collaborator = await CollaboratorsDAO.findByDesignAndUser(designId, design.userId);
      return collaborator ? [collaborator] : [];
    }

    case 'PARTNER': {
      const designCollaborators = await CollaboratorsDAO.findByDesign(designId);
      return designCollaborators
        .filter((collaborator: Collaborator) => collaborator.role === 'PARTNER');
    }

    case 'CALA': {
      const collections = await CollectionsDAO.findByDesign(design.id);

      if (!collections[0]) {
        return [];
      }

      const collection = collections[0];

      if (!CALA_OPS_USER_ID) { throw new Error('No CALA Ops user!'); }

      return CollaboratorsDAO.findByCollectionAndUser(collection.id, CALA_OPS_USER_ID);
    }
  }
}
