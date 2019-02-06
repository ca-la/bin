import { create } from '../../components/collaborators/dao';
import Collaborator from '../../components/collaborators/domain-objects/collaborator';

interface CollaboratorWithResources {
  collaborator: Collaborator;
}

export default async function generateCollaborator(
  options: Unsaved<Partial<Collaborator>> = {}
): Promise<CollaboratorWithResources> {
  const collaborator = await create({
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