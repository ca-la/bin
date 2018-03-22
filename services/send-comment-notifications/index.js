'use strict';

const findDesignUsers = require('../../services/find-design-users');
const { requireValues } = require('../require-properties');
const { enqueueSend } = require('../email');

async function sendCommentNotifications({ comment, design, section, user, text }) {
  requireValues({ comment, design, section, user, text });

  const recipients = (await findDesignUsers(design.id))
    .filter(collaborator => collaborator.id !== user.id)
    .map(collaborator => collaborator.email);

  for (let i = 0; i < recipients.length; i += 1) {
    await enqueueSend({
      to: recipients[i],
      templateName: 'add_comment',
      params: {
        comment,
        design,
        section,
        text,
        user
      }
    });
  }
}

module.exports = sendCommentNotifications;
