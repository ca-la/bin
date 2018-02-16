'use strict';

const uniq = require('lodash/uniq');
const sortedUniqBy = require('lodash/sortedUniqBy');

const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');
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
  const ownDesigns = await ProductDesignsDAO.findByUserId(userId, filters);

  const collaborations = await ProductDesignCollaboratorsDAO.findByUserId(userId);
  const invitedDesigns = await Promise.all(collaborations.map((collaboration) => {
    return ProductDesignsDAO.findById(collaboration.designId, filters);
  }));

  // Deleted designs become holes in the array right now - TODO maybe clean this
  // up via a reduce or something
  const availableInvitedDesigns = invitedDesigns.filter(Boolean);

  // Partners may be shared on a design via the "services" card - when we select
  // them as the provider for that service, they can see that design.
  const services = await ProductDesignServicesDAO.findByUserId(userId);
  const designIds = uniq(services.map(service => service.designId));

  const serviceDesigns = await Promise.all(designIds.map((designId) => {
    return ProductDesignsDAO.findById(designId, filters);
  }));

  const availableServiceDesigns = serviceDesigns.filter((design) => {
    // Deleted designs become holes in the array currently.
    if (!design) { return false; }

    // Partners don't see designs that are in draft
    if (design.status === 'DRAFT') {
      return false;
    }

    return true;
  });

  const allDesigns = [...ownDesigns, ...availableInvitedDesigns, ...availableServiceDesigns];
  const sorted = allDesigns.sort((a, b) => b.createdAt - a.createdAt);

  // It's possible that someone is shared on one design in multiple ways
  return sortedUniqBy(sorted, design => design.id);
}

module.exports = findUserDesigns;
