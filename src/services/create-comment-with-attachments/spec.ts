import uuid from "node-uuid";
import createUser = require("../../test-helpers/create-user");
import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../db";
import Knex from "knex";
import { createCommentWithAttachments } from "./index";
import { omit } from "lodash";
import * as AssetLinks from "../attach-asset-links";
import { BaseComment } from "../../components/comments/types";
import Asset from "../../components/assets/types";

test("createDesign service creates a collaborator", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  sandbox()
    .stub(AssetLinks, "constructAttachmentAssetLinks")
    .returns({ link: "link-to-something" });

  const commentBody: BaseComment = {
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: "A comment",
    userId: user.id,
  };

  const attachment: Asset = {
    createdAt: new Date(),
    description: null,
    id: uuid.v4(),
    mimeType: "image/jpeg",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "",
    userId: user.id,
    uploadCompletedAt: new Date(),
  };

  await db.transaction(async (trx: Knex.Transaction) => {
    const comment = await createCommentWithAttachments(trx, {
      attachments: [attachment],
      userId: user.id,
      comment: commentBody,
    });

    t.deepEqual(
      {
        ...comment,
        attachments: [
          omit(
            comment.attachments[0],
            "createdAt",
            "uploadCompletedAt",
            "deletedAt"
          ),
        ],
      },
      {
        ...commentBody,
        userEmail: user.email,
        userRole: user.role,
        userName: user.name,
        attachments: [
          {
            ...omit(attachment, "createdAt", "uploadCompletedAt"),
            link: "link-to-something",
          },
        ],
        replyCount: 0,
      }
    );
  });
});
