import CollaboratorsDAO = require('../../components/collaborators/dao');
import { createDesignTasks } from '../create-design-tasks';
import ProductDesign = require('../../domain-objects/product-design');
import ProductDesignsDAO = require('../../dao/product-designs');
import ProductDesignServicesDAO = require('../../dao/product-design-services');

async function createDesign(data: Unsaved<ProductDesign>): Promise<ProductDesign> {
  const design = await ProductDesignsDAO.create(data);

  // Create a default set of services
  await ProductDesignServicesDAO.replaceForDesign(design.id, [
    { serviceId: 'SOURCING' },
    { serviceId: 'TECHNICAL_DESIGN' },
    { serviceId: 'PATTERN_MAKING' },
    { serviceId: 'SAMPLING' },
    { serviceId: 'PRODUCTION' },
    { serviceId: 'FULFILLMENT' }
  ]);

  await CollaboratorsDAO.create({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: design.userId
  });

  await createDesignTasks({
    designId: design.id,
    designPhase: 'POST_CREATION'
  });

  return design;
}

export default createDesign;
