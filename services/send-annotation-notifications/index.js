'use strict';

const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');
const UsersDAO = require('../../dao/users');
const { requireValues } = require('../require-properties');
const { enqueueSend } = require('../email');

async function sendAnnotationNotifications({ design, user, text }) {
  requireValues({ design, user, text });

  const collaborators = await ProductDesignCollaboratorsDAO.findByDesign(design.id);
  const owner = await UsersDAO.findById(design.userId);

  let recipients = [owner.email];

  collaborators.forEach((collaborator) => {
    if (collaborator.user) {
      recipients.push(collaborator.user.email);
    }
  });

  recipients = recipients.filter(email => email !== user.email);

  for (let i = 0; i < recipients.length; i += 1) {
    await enqueueSend(
      recipients[i],
      'add_section_annotation',
      {
        user,
        design,
        text
      }
    );
  }
}

module.exports = sendAnnotationNotifications;
