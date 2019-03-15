import {
  MENTION_TYPE_START,
  MENTION_UUID_LENGTH,
  MENTION_UUID_START,
  mentionRgx,
  MentionType
} from '@cala/ts-lib';

import { findById as findCollaboratorById } from '../../components/collaborators/dao';
import getCollaboratorName from '../get-collaborator-name';

export default async function parseCommentText(text: string): Promise<string> {
  const matches = text.match(mentionRgx);
  if (!matches) {
    return text;
  }
  return matches.reduce(async (accPromise: Promise<string>, match: string) => {
    const acc = await accPromise;
    const matchId = match.substring(
      MENTION_UUID_START,
      MENTION_UUID_START + MENTION_UUID_LENGTH);
    const matchType = match.substring(MENTION_TYPE_START, match.length - 1) as MentionType;
    switch (matchType) {
      case MentionType.collaborator: {
        const collaborator = await findCollaboratorById(matchId);
        if (!collaborator) {
          return acc;
        }
        return acc.replace(match, `@${getCollaboratorName(collaborator)}`);
      }
      default: {
        return acc;
      }
    }
  },
  Promise.resolve(text));
}
