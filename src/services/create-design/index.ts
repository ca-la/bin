import ProductDesign = require('../../domain-objects/product-design');
import ProductDesignsDAO = require('../../dao/product-designs');
import ProductDesignServicesDAO = require('../../dao/product-design-services');
import createDesignTasks from '../create-design-tasks';

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

  await createDesignTasks({
    designId: design.id,
    designPhase: 'POST_CREATION'
  });

  return design;
}

export default createDesign;
