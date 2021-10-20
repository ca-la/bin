import Knex from "knex";
import db from "../../../services/db";
import * as CollectionsDAO from "../../collections/dao";
import * as CollaboratorsDAO from "../../collaborators/dao";
import Collaborator, {
  Roles as CollaboratorRole,
} from "../../collaborators/types";
import TeamUsersDAO from "../../team-users/dao";
import { Role as TeamUserRole } from "../../team-users/types";

const CAN_CREATE_TEAM_ROLES: TeamUserRole[] = [
  TeamUserRole.ADMIN,
  TeamUserRole.EDITOR,
  TeamUserRole.OWNER,
  TeamUserRole.TEAM_PARTNER,
];

const CAN_CREATE_COLLABORATOR_ROLES: CollaboratorRole[] = [
  "EDIT",
  "OWNER",
  "PARTNER",
];

export async function canCreate(
  collectionId: string | null,
  userId: string,
  sessionRole: string,
  ktx: Knex = db
) {
  if (collectionId === null || sessionRole === "ADMIN") {
    return true;
  }

  const maybeCollection = await CollectionsDAO.findById(collectionId);
  const collectionCollaborators = await CollaboratorsDAO.findByCollectionAndUser(
    collectionId,
    userId,
    ktx
  );
  const canCreateCollaborator = collectionCollaborators.some(
    (collaborator: Collaborator) =>
      CAN_CREATE_COLLABORATOR_ROLES.includes(collaborator.role)
  );

  if (canCreateCollaborator) {
    return true;
  }

  const teamId = maybeCollection?.teamId;
  const maybeTeamUser = teamId
    ? await TeamUsersDAO.findOne(ktx, { teamId, userId })
    : null;

  const canCreateTeamUser = maybeTeamUser
    ? CAN_CREATE_TEAM_ROLES.includes(maybeTeamUser.role)
    : false;

  return canCreateTeamUser;
}
