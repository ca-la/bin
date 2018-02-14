'use strict';

const uniqBy = require('lodash/uniqBy');

const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');
const ProductDesignServicesDAO = require('../../dao/product-design-services');
const ProductDesignsDAO = require('../../dao/product-designs');
const UsersDAO = require('../../dao/users');

async function findDesignUsers(designId) {
  const design = await ProductDesignsDAO.findById(designId);
  if (!design) { throw new Error(`Cannot find users for unknown design ${designId}`); }

  const owner = await UsersDAO.findById(design.userId);

  const users = [owner];

  const collaborators = await ProductDesignCollaboratorsDAO.findByDesign(designId);

  collaborators.forEach((collaborator) => {
    if (collaborator.user) {
      users.push(collaborator.user);
    }
  });

  const services = await ProductDesignServicesDAO.findByDesignId(designId);

  for (const service of services) {
    if (service.vendorUserId) {
      const user = await UsersDAO.findById(service.vendorUserId);
      users.push(user);
    }
  }

  const uniqueUsers = uniqBy(users, 'id');
  return uniqueUsers;
}

module.exports = findDesignUsers;
