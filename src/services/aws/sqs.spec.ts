import tape from "tape";

import * as SQSService from "./sqs";
import { test } from "../../test-helpers/fresh";

test("AWS Service supports enqueuing a message", async (t: tape.Test) => {
  // Note: The SQS service is already mocked in the test setup
  await SQSService.enqueueMessage({
    messageType: "foo-bar",
    payload: "foo",
    queueRegion: "us-east-2",
    queueUrl: "foo-bar.biz",
  });
  t.ok("enqueueMessage resolves successfully");
});
