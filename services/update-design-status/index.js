'use strict';

const EmailService = require('../email');
const ProductDesignsDAO = require('../../dao/product-designs');
const ProductDesignStatusUpdatesDAO = require('../../dao/product-design-status-updates');
const UsersDAO = require('../../dao/users');
const { assert, requireValues } = require('../require-properties');
const { DESIGN_UPDATED_EMAIL } = require('../../config');
const { PAYMENT_STATUSES } = require('../../config/design-statuses');

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

  if (PAYMENT_STATUSES.indexOf(newStatus) > -1) {
    await Invoices.create({

    });
  }

  const user = await UsersDAO.findById(userId);

  await EmailService.enqueueSend(
    DESIGN_UPDATED_EMAIL,
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
