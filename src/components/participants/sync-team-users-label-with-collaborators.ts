import { MentionType } from "../comments/types";
import { Participant } from "./types";

export default function syncTeamUsersLabelWithCollaborators(
  participants: Participant[]
): Participant[] {
  const updatedParticipants = [...participants];
  for (const participant of updatedParticipants) {
    const isTeamUserWithLabel =
      participant.type === MentionType.TEAM_USER && participant.label !== null;
    if (!isTeamUserWithLabel || participant.userId === null) {
      continue;
    }

    const collaboratorIndex = participants.findIndex(
      (participantItem: Participant) =>
        participantItem.userId === participant.userId &&
        participantItem.type === MentionType.COLLABORATOR
    );

    if (collaboratorIndex === -1) {
      continue;
    }

    updatedParticipants[collaboratorIndex] = {
      ...updatedParticipants[collaboratorIndex],
      label: participant.label,
    };
  }

  return updatedParticipants;
}
