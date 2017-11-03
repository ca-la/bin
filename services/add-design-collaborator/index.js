'use strict';

const escape = require('lodash/escape');

const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');
const ProductDesignsDAO = require('../../dao/product-designs');
const sharingEmail = require('../../emails/sharing');
const UsersDAO = require('../../dao/users');
const { isValidEmail } = require('../../services/validation');
const { send } = require('../email');
const { STUDIO_HOST } = require('../../config');

function getRoleDescription(role) {
  switch (role) {
    case 'EDIT': return 'edit';
    case 'COMMENT': return 'comment on';
    case 'VIEW': return 'view';
    default: return 'collaborate on';
  }
}

/**
 * Add a collaborator to a design. If a user exists with this email, adds them
 * straight away. If not, creates a pending collaborator (i.e. with just the
 * email on file) and dispatches an email.
 *
 * Whenever someone signs up, we check for outstanding invitations and add them
 * to all relevant designs.
 *
 * @param {uuid} designId
 * @param {String} email
 * @param {String} role
 * @param {String} unsaveInvitationMessage
 */
async function addDesignCollaborator(
  designId,
  email,
  role,
  unsafeInvitationMessage
) {
  if (!isValidEmail(email)) {
    throw new InvalidDataError('Invalid email address');
  }

  const user = await UsersDAO.findByEmail(email);

  const design = await ProductDesignsDAO.findById(designId);
  const inviter = await UsersDAO.findById(design.userId);

  const escapedMessage = escape(unsafeInvitationMessage);
  const invitationMessage = escapedMessage || 'Check out CALA!';

  let collaborator;

  if (user) {
    collaborator = await ProductDesignCollaboratorsDAO.create({
      designId,
      role,
      userId: user.id
    });
  } else {
    collaborator = await ProductDesignCollaboratorsDAO.create({
      designId,
      role,
      userEmail: email,
      invitationMessage
    });
  }

  const imageUrl = (design.previewImageUrls && design.previewImageUrls[0]) || '';

  const senderName = inviter.name;

  const title = design.title || 'Untitled Garment';

  await send(
    email,
    `${senderName} invited you to collaborate on ${title}`,
    sharingEmail({
      senderName: inviter.name,
      roleDescription: getRoleDescription(role),
      designTitle: title,
      designUrl: `${STUDIO_HOST}/designs/${design.id}`,
      invitationMessage,
      previewImageUrl: imageUrl
    })
  );

  return collaborator;
}

module.exports = addDesignCollaborator;
