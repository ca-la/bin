'use strict';

const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');
const UsersDAO = require('../../dao/users');
const { send } = require('../email');

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
 */
async function addDesignCollaborator(designId, email, role) {
  const user = await UsersDAO.findByEmail(email);

  if (user) {
    return await ProductDesignCollaboratorsDAO.create({
      designId,
      role,
      userId: user.id
    });
  }

  const collaborator = await ProductDesignCollaboratorsDAO.create({
    designId,
    role,
    userEmail: email
  });

  await send(
    email,
    "You've been invited to collaborate on a garment",
    `Someone has invited you to collaborate on a garment using CALA.<br />
    To accept this invitation, follow this link: https://studio.ca.la`
  );

  return collaborator;
}

module.exports = addDesignCollaborator;
