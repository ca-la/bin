import * as CollaboratorsDAO from "../../components/collaborators/dao";
import { Collaborator } from "../../published-types";

/**
 * Find any outstanding product design collaboration invitations for a new user,
 * and replace them with actual access.
 * @param {String} userEmail
 * @param {uuid} userId
 */
export async function claimDesignInvitations(
  userEmail: string,
  userId: string
) {
  const invitations = await CollaboratorsDAO.findUnclaimedByEmail(userEmail);

  await Promise.all(
    invitations.map((invitation: Collaborator) =>
      CollaboratorsDAO.update(invitation.id, {
        userEmail: null,
        userId,
      })
    )
  );
}
