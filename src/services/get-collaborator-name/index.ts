import { CollaboratorWithUser } from "../../components/collaborators/types";

export default function getCollaboratorName(
  collaborator: CollaboratorWithUser
): string {
  return collaborator.user && collaborator.user.name
    ? collaborator.user.name
    : collaborator.userEmail || "No Name";
}
