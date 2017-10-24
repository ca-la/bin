'use strict';

const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');

/**
 * Find any outstanding product design collaboration invitations for a new user,
 * and replace them with actual access.
 * @param {String} userEmail
 * @param {uuid} userId
 */
async function claimDesignInvitations(userEmail, userId) {
  const invitations = await ProductDesignCollaboratorsDAO.findUnclaimedByEmail(userEmail);

  await Promise.all(
    invitations.map(invitation =>
      ProductDesignCollaboratorsDAO.update(invitation.id, {
        userEmail: null,
        userId
      })
    )
  );
}

module.exports = claimDesignInvitations;
