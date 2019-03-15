import { CollaboratorWithUser } from '../../components/collaborators/domain-objects/collaborator';

export default function getCollaboratorName(collaborator: CollaboratorWithUser): string {
  return collaborator.user
    ? collaborator.user.name
    : collaborator.userEmail || 'No Name';
}
