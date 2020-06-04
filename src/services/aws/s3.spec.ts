import tape from "tape";
import AWS from "aws-sdk";

import * as S3Service from "./s3";
import { sandbox, test } from "../../test-helpers/fresh";

test("AWS Service supports enqueuing a message", async (t: tape.Test) => {
  sandbox().restore();
  const awsStub = sandbox()
    .stub(AWS, "S3")
    .returns({
      putObject: (): object => {
        return {
          promise: (): object => {
            return {
              $response: {
                foo: "bar",
              },
            };
          },
        };
      },
    });

  await S3Service.uploadToS3({
    acl: "authenticated-read",
    bucketName: "iris-s3-foo",
    contentType: "application/json",
    resource: { foo: "bar", biz: "bazz" },
  });
  t.true(awsStub.calledOnce, "Calls the s3 service only once");
});
