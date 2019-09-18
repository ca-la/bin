'use strict';

const uniqBy = require('lodash/uniqBy');

const CollaboratorsDAO = require('../../components/collaborators/dao');
const ProductDesignServicesDAO = require('../../dao/product-design-services');
const ProductDesignsDAO = require('../../components/product-designs/dao');
const UsersDAO = require('../../components/users/dao');

/**
 * Find a list of users with access to a design
 *
 * NB: the criteria for "who can access a design" needs to be kept in sync with
 * `getDesignPermissions` and `findUserDesigns` until we find a nice way to
 * combine them.
 */
async function findDesignUsers(designId) {
  const design = await ProductDesignsDAO.findById(designId);
  if (!design) {
    throw new Error(`Cannot find users for unknown design ${designId}`);
  }

  const owner = await UsersDAO.findById(design.userId);

  const users = [owner];

  const collaborators = await CollaboratorsDAO.findByDesign(designId);

  collaborators.forEach(collaborator => {
    if (collaborator.user) {
      users.push(collaborator.user);
    }
  });

  // Service providers do not see a design prior to it being submitted
  if (design.status !== 'DRAFT') {
    const services = await ProductDesignServicesDAO.findByDesignId(designId);

    for (const service of services) {
      if (service.vendorUserId) {
        const user = await UsersDAO.findById(service.vendorUserId);
        users.push(user);
      }
    }
  }

  const uniqueUsers = uniqBy(users, 'id');
  return uniqueUsers;
}

module.exports = findDesignUsers;
