'use strict';

const ProductDesignsDAO = require('../../dao/product-designs');
const UsersDAO = require('../../dao/users');
const ProductDesignStatusUpdatesDAO = require('../../dao/product-design-status-updates');
const { assert, requireValues } = require('../require-properties');
const EmailService = require('../email');

async function updateDesignStatus(designId, newStatus, userId) {
  requireValues({ designId, newStatus, userId });

  const design = await ProductDesignsDAO.update(designId, {
    status: newStatus
  });

  assert(design, 'Design not found');

  await ProductDesignStatusUpdatesDAO.create({
    designId,
    newStatus,
    userId
  });

  const user = await UsersDAO.findById(userId);

  await EmailService.enqueueSend(
    'hi@ca.la',
    'update_design_status',
    {
      user,
      design,
      newStatus
    }
  );

  return newStatus;
}

module.exports = updateDesignStatus;
