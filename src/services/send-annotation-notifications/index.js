'use strict';

const findDesignUsers = require('../../services/find-design-users');
const { validateValues } = require('../validate');
const { enqueueSend } = require('../email');

async function sendAnnotationNotifications({
  annotation, design, user, text
}) {
  validateValues({ design, user, text });

  const recipients = (await findDesignUsers(design.id))
    .filter(collaborator => collaborator.id !== user.id)
    .map(collaborator => collaborator.email);

  for (let i = 0; i < recipients.length; i += 1) {
    await enqueueSend({
      to: recipients[i],
      templateName: 'add_section_annotation',
      params: {
        annotation,
        user,
        design,
        text
      }
    });
  }
}

module.exports = sendAnnotationNotifications;
