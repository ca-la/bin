import { create } from '../../components/collaborators/dao';
import Collaborator, {
  CollaboratorWithUser
} from '../../components/collaborators/domain-objects/collaborator';

interface CollaboratorWithResources {
  collaborator: CollaboratorWithUser;
}

export default async function generateCollaborator(
  options: Unsaved<Partial<Collaborator>> = {}
): Promise<CollaboratorWithResources> {
  const collaborator = await create({
    cancelledAt: null,
    collectionId: null,
    designId: null,
    invitationMessage: 'Hey check out my cool thing on CALA',
    role: 'EDIT',
    userEmail: null,
    userId: null,
    ...options
  });

  return { collaborator };
}
