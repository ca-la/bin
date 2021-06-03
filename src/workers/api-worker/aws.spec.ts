import AWS from "aws-sdk";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import config from "../../config";
import { readMessage, deleteMessage } from "./aws";

async function beforeEach(): Promise<void> {
  sandbox().restore();
}

test(
  "readMessage() can return a response",
  async (t: Test) => {
    const sqsStub = sandbox()
      .stub(AWS, "SQS")
      .returns({
        receiveMessage: (): any => {
          return {
            promise: async (): Promise<any> => {
              return Promise.resolve({
                Messages: [{ foo: "bar" }],
              });
            },
          };
        },
      });
    sandbox().stub(config, "AWS_API_WORKER_SQS_URL").value("sqs-url");
    sandbox().stub(config, "AWS_API_WORKER_SQS_REGION").value("sqs-region");

    const response = (await readMessage()) as object;

    t.true(sqsStub.calledOnce);
    t.deepEqual(response, { foo: "bar" });
  },
  beforeEach
);

test(
  "readMessage() can return null",
  async (t: Test) => {
    const sqsStub = sandbox()
      .stub(AWS, "SQS")
      .returns({
        receiveMessage: (): any => {
          return {
            promise: async (): Promise<any> => {
              return Promise.resolve({
                Messages: [],
              });
            },
          };
        },
      });
    sandbox().stub(config, "AWS_API_WORKER_SQS_URL").value("sqs-url");
    sandbox().stub(config, "AWS_API_WORKER_SQS_REGION").value("sqs-region");

    const response = (await readMessage()) as any;

    t.true(sqsStub.calledOnce);
    t.is(response, null);
  },
  beforeEach
);

test(
  "readMessage() will error out if there are >1 messages",
  async (t: Test) => {
    const sqsStub = sandbox()
      .stub(AWS, "SQS")
      .returns({
        receiveMessage: (): any => {
          return {
            promise: async (): Promise<any> => {
              return Promise.resolve({
                Messages: [{ foo: "bar" }, { biz: "baz" }],
              });
            },
          };
        },
      });
    sandbox().stub(config, "AWS_API_WORKER_SQS_URL").value("sqs-url");
    sandbox().stub(config, "AWS_API_WORKER_SQS_REGION").value("sqs-region");

    try {
      await readMessage();
    } catch (error) {
      t.true(sqsStub.calledOnce);
      t.is(error.message, "Expected 1 message, received: 2");
    }
  },
  beforeEach
);

test(
  "deleteMessage() can delete a file",
  async (t: Test) => {
    const sqsStub = sandbox()
      .stub(AWS, "SQS")
      .returns({
        deleteMessage: (): any => {
          return {
            promise: async (): Promise<any> => {
              return Promise.resolve("Deleted something...");
            },
          };
        },
      });
    sandbox().stub(config, "AWS_API_WORKER_SQS_URL").value("sqs-url");
    sandbox().stub(config, "AWS_API_WORKER_SQS_REGION").value("sqs-region");

    await deleteMessage("foo-bar");

    t.true(sqsStub.calledOnce);
  },
  beforeEach
);
