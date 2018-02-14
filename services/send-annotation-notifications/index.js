'use strict';

const findDesignUsers = require('../../services/find-design-users');
const { requireValues } = require('../require-properties');
const { enqueueSend } = require('../email');

async function sendAnnotationNotifications({ annotation, design, user, text }) {
  requireValues({ design, user, text });

  const recipients = (await findDesignUsers(design.id))
    .filter(collaborator => collaborator.id !== user.id)
    .map(collaborator => collaborator.email);

  for (let i = 0; i < recipients.length; i += 1) {
    await enqueueSend(
      recipients[i],
      'add_section_annotation',
      {
        annotation,
        user,
        design,
        text
      }
    );
  }
}

module.exports = sendAnnotationNotifications;
