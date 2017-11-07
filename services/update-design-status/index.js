'use strict';

const ProductDesignsDAO = require('../../dao/product-designs');
const ProductDesignStatusUpdatesDAO = require('../../dao/product-design-status-updates');
const { assert } = require('../require-properties');

async function updateDesignStatus(designId, newStatus, userId) {
  assert(designId, 'Design ID is required');
  assert(newStatus, 'New status is required');
  assert(userId, 'User ID is required');

  const updated = await ProductDesignsDAO.update(designId, {
    status: newStatus
  });

  assert(updated, 'Design not found');

  await ProductDesignStatusUpdatesDAO.create({
    designId,
    newStatus,
    userId
  });

  return newStatus;
}

module.exports = updateDesignStatus;
