import { MentionType, MentionMeta, isMentionType } from "./types";

const hexExp = "[a-fA-F0-9]";
const uuidExp = [
  `${hexExp}{8}`,
  `${hexExp}{4}`,
  `${hexExp}{4}`,
  `${hexExp}{4}`,
  `${hexExp}{12}`,
].join("-");
export const mentionExp = [
  "@<",
  `(?<id>${uuidExp})`,
  "\\|",
  `(?<type>${Object.values(MentionType).join("|")})`,
  ">",
].join("");

export function parseAtMentions(text: string): MentionMeta[] {
  const mentionRegExp = new RegExp(mentionExp, "g");

  let match;
  const matches: MentionMeta[] = [];

  // TODO: refactor to matchAll when we upgrade to Node 12
  // tslint:disable-next-line:no-conditional-assignment
  while ((match = mentionRegExp.exec(text)) !== null) {
    const { id, type } = match.groups as { id: string; type: string };
    if (isMentionType(type)) {
      matches.push({ id, type });
    }
  }

  return matches;
}
