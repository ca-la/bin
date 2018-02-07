'use strict';

const createInvoice = require('../../services/create-invoice');
const EmailService = require('../email');
const ProductDesignsDAO = require('../../dao/product-designs');
const ProductDesignStatusUpdatesDAO = require('../../dao/product-design-status-updates');
const UsersDAO = require('../../dao/users');
const { assert, requireValues } = require('../require-properties');
const { DESIGN_UPDATED_EMAIL } = require('../../config');
const { PAYMENT_STATUSES } = require('../../config/design-statuses');

async function updateDesignStatus(designId, newStatus, userId) {
  requireValues({ designId, newStatus, userId });

  const design = await ProductDesignsDAO.findById(designId);
  assert(design, 'Design not found');

  if (PAYMENT_STATUSES.indexOf(newStatus) > -1) {
    await createInvoice(design, newStatus);
  }

  const updatedDesign = await ProductDesignsDAO.update(designId, {
    status: newStatus
  });

  await ProductDesignStatusUpdatesDAO.create({
    designId,
    newStatus,
    userId
  });

  const user = await UsersDAO.findById(userId);

  await EmailService.enqueueSend(
    DESIGN_UPDATED_EMAIL,
    'update_design_status',
    {
      user,
      design: updatedDesign,
      newStatus
    }
  );

  return newStatus;
}

module.exports = updateDesignStatus;
