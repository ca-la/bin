import CollaboratorsDAO = require('../../dao/collaborators');
import CollectionsDAO = require('../../dao/collections');
import ProductDesignsDAO = require('../../dao/product-designs');
import UsersDAO = require('../../dao/users');
import { CALA_ADMIN_USER_ID } from '../../config';
import { Collaborator } from '../../domain-objects/collaborator';

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

  const collections = await CollectionsDAO.findByDesign(design.id);

  if (!collections[0]) {
    return [];
  }

  const collection = collections[0];

  switch (role) {
    case 'DESIGNER':
      return CollaboratorsDAO.findByCollectionAndUser(collection.id, design.userId);

    case 'PARTNER': {
      const collaborators = [];
      const designCollaborators = await CollaboratorsDAO.findByDesign(designId);

      for (const collaborator of designCollaborators) {
        const user = await UsersDAO.findById(collaborator.userId);
        if (user.role === 'PARTNER') {
          collaborators.push(collaborator);
        }
      }

      return collaborators;
    }

    case 'CALA':
      return CollaboratorsDAO.findByCollectionAndUser(collection.id, CALA_ADMIN_USER_ID);
  }
}
