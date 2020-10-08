import { create } from "../../components/collaborators/dao";
import Collaborator, {
  CollaboratorWithUser,
} from "../../components/collaborators/types";
import Knex from "knex";

interface CollaboratorWithResources {
  collaborator: CollaboratorWithUser;
}

export default async function generateCollaborator(
  options: Unsaved<Partial<Collaborator>> = {},
  trx?: Knex.Transaction
): Promise<CollaboratorWithResources> {
  const collaborator = await create(
    {
      cancelledAt: null,
      collectionId: null,
      designId: null,
      invitationMessage: "Hey check out my cool thing on CALA",
      role: "EDIT",
      userEmail: null,
      userId: null,
      teamId: null,
      ...options,
    },
    trx
  );

  return { collaborator };
}
