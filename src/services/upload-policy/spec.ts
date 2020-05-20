import tape from "tape";
import uuid from "node-uuid";

import { sandbox, test } from "../../test-helpers/fresh";
import * as AWSService from "../../services/aws";
import { generateUploadPolicy } from "./index";

test("generateUploadPolicy", async (t: tape.Test) => {
  const uploadPolicyStub = sandbox()
    .stub(AWSService, "getUploadPolicy")
    .returns({
      fields: {
        "x-aws-foo": "bar",
      },
      url: "https://example.com/foo",
    });

  const id = uuid.v4();
  const result = generateUploadPolicy({
    id,
    downloadBaseUrl: "https://foo.example",
    mimeType: "text/csv",
    s3Bucket: "s3-foo",
    s3Region: "s3-bar",
  });
  const expected = {
    contentDisposition: `attachment; filename="${id}.csv"`,
    contentType: "text/csv",
    downloadUrl: `https://foo.example/${id}`,
    formData: { "x-aws-foo": "bar" },
    remoteFileName: id,
    uploadUrl: "https://example.com/foo",
  };

  t.deepEqual(result, expected);
  t.equal(uploadPolicyStub.callCount, 1);
});
