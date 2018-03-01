'use strict';

const createInvoice = require('../../services/create-invoice');
const EmailService = require('../email');
const Logger = require('../logger');
const MissingPrerequisitesError = require('../../errors/missing-prerequisites');
const ProductDesignsDAO = require('../../dao/product-designs');
const ProductDesignStatusUpdatesDAO = require('../../dao/product-design-status-updates');
const UsersDAO = require('../../dao/users');
const { ADMIN_EMAIL } = require('../../config');
const { assert, requireValues } = require('../require-properties');
const { PAYMENT_STATUSES } = require('../../config/design-statuses');

async function updateDesignStatus(designId, newStatus, userId) {
  requireValues({ designId, newStatus, userId });

  const design = await ProductDesignsDAO.findById(designId);
  assert(design, 'Design not found');

  if (PAYMENT_STATUSES.indexOf(newStatus) > -1) {
    try {
      await createInvoice(design, newStatus);
    } catch (err) {
      if (err instanceof MissingPrerequisitesError) {
        Logger.logServerError(`Forced design ${designId} into the ${newStatus} phase, but unable to generate an invoice`);
      } else {
        throw err;
      }
    }
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

  await EmailService.enqueueSend({
    to: ADMIN_EMAIL,
    templateName: 'update_design_status',
    params: {
      user,
      design: updatedDesign,
      newStatus
    }
  });

  return newStatus;
}

module.exports = updateDesignStatus;
