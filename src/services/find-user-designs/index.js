'use strict';

const uniq = require('lodash/uniq');
const flatten = require('lodash/flatten');
const sortedUniqBy = require('lodash/sortedUniqBy');

const CollaboratorsDAO = require('../../dao/collaborators');
const ProductDesignServicesDAO = require('../../dao/product-design-services');
const ProductDesignsDAO = require('../../dao/product-designs');

/**
 * Find all designs that either the user owns, or is a collaborator with access.
 *
 * The opposite of `findDesignUsers`.
 *
 * NB: the criteria for "who can access a design" needs to be kept in sync with
 * `getDesignPermissions` and `findDesignUsers` until we find a nice way to
 * combine them.
 *
 * @returns {Promise<Design[]>}
 */
async function findUserDesigns(userId, filters) {
  const ownDesigns = await ProductDesignsDAO
    .findByUserId(userId, filters)
    .then(yourDesigns => yourDesigns.map(
      design => ({ ...design, role: 'EDIT' })
    ));

  const collaborations = await CollaboratorsDAO.findByUserId(userId);
  const invitedDesigns = await Promise.all(collaborations
    .reduce((acc, collaboration) => {
      if (collaboration.designId) {
        const collaborationDesign = ProductDesignsDAO
          .findById(collaboration.designId, filters)
          .then((design) => {
            if (design) {
              return { ...design, role: collaboration.role };
            }
            return design;
          });
        return [...acc, collaborationDesign];
      }
      if (collaboration.collectionId) {
        const collaborationDesigns = ProductDesignsDAO
          .findByCollectionId(collaboration.collectionId)
          .then((designs) => {
            return designs.map(design => ({ ...design, role: collaboration.role }));
          });
        return [...acc, collaborationDesigns];
      }
      return acc;
    }, []));

  // Deleted designs become holes in the array right now - TODO maybe clean this
  // up via a reduce or something
  const availableInvitedDesigns = flatten(invitedDesigns).filter(Boolean);

  // Partners may be shared on a design via the "services" card - when we select
  // them as the provider for that service, they can see that design.
  const services = await ProductDesignServicesDAO.findByUserId(userId);
  const designIds = uniq(services.map(service => service.designId));

  const serviceDesigns = await Promise.all(designIds.map((designId) => {
    return ProductDesignsDAO.findById(designId, filters);
  }));

  const availableServiceDesigns = serviceDesigns
    .filter((design) => {
      // Deleted designs become holes in the array currently.
      // Partners don't see designs that are in draft
      return Boolean(design) && design.status !== 'DRAFT';
    })
    .map(design => ({ ...design, role: 'PARTNER' }));

  const allDesigns = [...ownDesigns, ...availableInvitedDesigns, ...availableServiceDesigns];
  const sorted = allDesigns.sort((a, b) => b.createdAt - a.createdAt);

  // It's possible that someone is shared on one design in multiple ways
  return sortedUniqBy(sorted, design => design.id);
}

module.exports = findUserDesigns;
