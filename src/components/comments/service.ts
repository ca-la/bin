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
  `(?:${uuidExp})`,
  "\\|",
  `(?:${Object.values(MentionType).join("|")})`,
  ">",
].join("");
const MENTION_UUID_END = 38;
const MENTION_UUID_START = 2;
const MENTION_TYPE_START = 39;

export function parseAtMentions(text: string): MentionMeta[] {
  const matches = text.match(new RegExp(mentionExp, "g")) || [];

  return matches.reduce((parsed: MentionMeta[], found: string) => {
    const id = found.substring(MENTION_UUID_START, MENTION_UUID_END);
    const type = found.substring(MENTION_TYPE_START, found.length - 1);

    if (!isMentionType(type)) {
      return parsed;
    }

    return [
      ...parsed,
      {
        id,
        type,
      },
    ];
  }, []);
}
