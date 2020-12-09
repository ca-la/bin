import tape from "tape";
import Configuration from "../../config";

import { sandbox, test } from "../../test-helpers/fresh";
import generateComment from "../../test-helpers/factories/comment";
import generateAsset from "../../test-helpers/factories/asset";
import { addAttachmentLinks } from "./index";

function stubUrls(): void {
  sandbox()
    .stub(Configuration, "USER_UPLOADS_BASE_URL")
    .value("https://user-uploads.example.com");
  sandbox()
    .stub(Configuration, "USER_UPLOADS_IMGIX_URL")
    .value("https://imgix.example.com");
}

test("addAssetLink adds asset links to attached asset", async (t: tape.Test) => {
  stubUrls();

  const commentWithAttachment = {
    ...(await generateComment()).comment,
    attachments: [(await generateAsset()).asset],
  };

  const commentWithLink = addAttachmentLinks(commentWithAttachment);
  t.deepEqual(commentWithLink, {
    ...commentWithAttachment,
    attachments: [
      {
        ...commentWithAttachment.attachments[0],
        fileType: "jpeg",
        assetLink: `https://imgix.example.com/${commentWithAttachment.attachments[0].id}?fm=jpg&fit=max`,
        thumbnail2xLink: `https://imgix.example.com/${commentWithAttachment.attachments[0].id}?fm=jpg&fit=fill&h=106&w=128&dpr=2`,
        thumbnailLink: `https://imgix.example.com/${commentWithAttachment.attachments[0].id}?fm=jpg&fit=fill&h=106&w=128`,
        downloadLink: `https://user-uploads.example.com/${commentWithAttachment.attachments[0].id}`,
        assetId: commentWithAttachment.attachments[0].id,
      },
    ],
  });
});

test("addAssetLink does nothing if the comment has no attachments", async (t: tape.Test) => {
  stubUrls();

  const comment = (await generateComment()).comment;

  const commentWithLinks = addAttachmentLinks(comment);
  t.equal(comment, commentWithLinks);
});
