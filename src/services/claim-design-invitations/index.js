'use strict';

const CollaboratorsDAO = require('../../components/collaborators/dao');

/**
 * Find any outstanding product design collaboration invitations for a new user,
 * and replace them with actual access.
 * @param {String} userEmail
 * @param {uuid} userId
 */
async function claimDesignInvitations(userEmail, userId) {
  const invitations = await CollaboratorsDAO.findUnclaimedByEmail(userEmail);

  await Promise.all(
    invitations.map(invitation =>
      CollaboratorsDAO.update(invitation.id, {
        userEmail: null,
        userId
      }))
  );
}

module.exports = claimDesignInvitations;
