import uuid from "node-uuid";
import { test, Test } from "../../test-helpers/fresh";

import * as CommentService from "./service";
import { MentionType } from "./types";

const id1 = uuid.v4();
const id2 = uuid.v4();
const none = "With no mentions";
const invalidType = `@<${id1}|invalidType>`;
const invalidId = `@<not-a-uuid|${MentionType.COLLABORATOR}`;
const valid1 = `@<${id1}|${MentionType.COLLABORATOR}>`;
const valid2 = `@<${id2}|${MentionType.TEAM_USER}>`;

test("CommentService.parseAtMention", async (t: Test) => {
  t.deepEquals(CommentService.parseAtMentions(none), [], "no mentions / empty");

  t.deepEquals(
    CommentService.parseAtMentions(
      `With an invalid mention type ${invalidType}`
    ),
    [],
    "invalid mention type / empty"
  );

  t.deepEquals(
    CommentService.parseAtMentions(`With an invalid id format ${invalidId}`),
    [],
    "invalid id format / empty"
  );

  t.deepEquals(
    CommentService.parseAtMentions(`With single valid mention ${valid1}`),
    [{ id: id1, type: MentionType.COLLABORATOR }],
    "single valid mention"
  );

  t.deepEquals(
    CommentService.parseAtMentions(
      `With multiple valid mentions ${valid1} ${valid2}`
    ),
    [
      { id: id1, type: MentionType.COLLABORATOR },
      { id: id2, type: MentionType.TEAM_USER },
    ],
    "multiple valid mentions"
  );

  t.deepEquals(
    CommentService.parseAtMentions(`With a mix ${invalidType} ${valid2}`),
    [{ id: id2, type: MentionType.TEAM_USER }],
    "invalid and valid mentions"
  );
});

test("CommentService.mentionExp", async (t: Test) => {
  const mentionRegExp = new RegExp(CommentService.mentionExp);
  t.false(mentionRegExp.test(none), "none / does not contain a match");
  t.false(
    mentionRegExp.test(invalidType),
    "invalidType / does not contain a match"
  );
  t.false(
    mentionRegExp.test(invalidId),
    "invalidId / does not contain a match"
  );
  t.true(mentionRegExp.test(valid1), "valid1 / contains a match");
  t.true(mentionRegExp.test(valid2), "valid2 / contains a match");
});
