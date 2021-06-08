import Knex from "knex";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import { messageHandler } from "./message-handler";
import { SQSMessage } from "./aws";
import * as PostProcessUserCreation from "./tasks/post-process-user-creation";
import { HandlerResult } from "./types";
import Logger from "../../services/logger";

test("message handler response with error if message task type is not supported", async (t: Test) => {
  const message: SQSMessage = {
    Body: JSON.stringify({ hello: "hello world" }),
  };

  const handler = messageHandler();
  try {
    const response = await handler(message);
    t.pass("Error is not thrown if type is not supported");

    t.deepEqual(
      response,
      {
        type: "FAILURE_DO_NOT_RETRY",
        error: new Error("Message type not supported! (no type)"),
      } as HandlerResult,
      "reponse with error and command to not retry the task"
    );
  } catch (e) {
    t.fail("should not throw an error");
  }
});

test("message handler response with error if message has no Body", async (t: Test) => {
  const message: SQSMessage = {};

  const handler = messageHandler();
  try {
    const response = await handler(message);
    t.pass("Error is not thrown if message doesn't have Body");

    t.deepEqual(
      response,
      {
        type: "FAILURE_DO_NOT_RETRY",
        error: new Error("No message Body found!"),
      } as HandlerResult,
      "reponse with error and command to not retry the task"
    );
  } catch (e) {
    t.fail("should not throw an error");
  }
});

test("message handler handle POST_PROCESS_USER_CREATION", async (t: Test) => {
  const trxStub = (sandbox().stub() as unknown) as Knex.Transaction;
  sandbox().stub(db, "transaction").yields(trxStub);
  const postProcessUserCreationStub = sandbox()
    .stub(PostProcessUserCreation, "postProcessUserCreation")
    .resolves({
      type: "SUCCESS",
      message: null,
    } as HandlerResult);
  const message: SQSMessage = {
    Body: JSON.stringify({ type: "POST_PROCESS_USER_CREATION" }),
  };
  const handler = messageHandler();
  try {
    const response = await handler(message);

    t.equal(postProcessUserCreationStub.callCount, 1, "task has been called");

    t.deepEqual(
      postProcessUserCreationStub.args,
      [
        [
          trxStub,
          {
            type: "POST_PROCESS_USER_CREATION",
          },
        ],
      ],
      "task has been called with right arguments inside transaction"
    );

    t.deepEqual(
      response,
      {
        type: "SUCCESS",
        message: null,
      } as HandlerResult,
      "reponse with post process user creation data"
    );
  } catch (e) {
    t.fail("should not throw an error");
  }
});

test("message handler handle POST_PROCESS_USER_CREATION which response with a error", async (t: Test) => {
  const trxStub = (sandbox().stub() as unknown) as Knex.Transaction;
  sandbox().stub(db, "transaction").yields(trxStub);
  const postProcessUserCreationStub = sandbox()
    .stub(PostProcessUserCreation, "postProcessUserCreation")
    .resolves({
      type: "FAILURE",
      error: new Error("Some error during processing"),
    } as HandlerResult);
  const errorLoggerStub = sandbox().stub(Logger, "logServerError");
  const message: SQSMessage = {
    Body: JSON.stringify({ type: "POST_PROCESS_USER_CREATION" }),
  };
  const handler = messageHandler();
  try {
    const response = await handler(message);

    t.equal(postProcessUserCreationStub.callCount, 1, "task has been called");

    t.deepEqual(
      postProcessUserCreationStub.args,
      [
        [
          trxStub,
          {
            type: "POST_PROCESS_USER_CREATION",
          },
        ],
      ],
      "task has been called with right arguments inside transaction"
    );

    t.deepEqual(
      response,
      {
        type: "FAILURE",
        error: new Error("Some error during processing"),
      } as HandlerResult,
      "reponse with post process user creation data"
    );

    t.equal(errorLoggerStub.callCount, 0, "error logger is not called");
  } catch (e) {
    t.fail("should not throw an error");
  }
});

test("message handler handle POST_PROCESS_USER_CREATION which throws an error", async (t: Test) => {
  const trxStub = (sandbox().stub() as unknown) as Knex.Transaction;
  sandbox().stub(db, "transaction").yields(trxStub);
  const postProcessUserCreationStub = sandbox()
    .stub(PostProcessUserCreation, "postProcessUserCreation")
    .throws(new Error("Unexpected error"));
  const errorLoggerStub = sandbox().stub(Logger, "logServerError");
  const message: SQSMessage = {
    Body: JSON.stringify({ type: "POST_PROCESS_USER_CREATION" }),
  };
  const handler = messageHandler();
  try {
    const response = await handler(message);

    t.equal(postProcessUserCreationStub.callCount, 1, "task has been called");

    t.deepEqual(
      postProcessUserCreationStub.args,
      [
        [
          trxStub,
          {
            type: "POST_PROCESS_USER_CREATION",
          },
        ],
      ],
      "task has been called with right arguments inside transaction"
    );

    t.deepEqual(
      response,
      {
        type: "FAILURE",
        error: new Error("Unexpected error"),
      } as HandlerResult,
      "reponse with post process user creation data"
    );

    t.equal(errorLoggerStub.callCount, 1, "error logger is not called");
    t.equal(
      errorLoggerStub.args[0][0],
      "Error in POST_PROCESS_USER_CREATION api worker task"
    );
  } catch (e) {
    t.fail("should not throw an error");
  }
});
