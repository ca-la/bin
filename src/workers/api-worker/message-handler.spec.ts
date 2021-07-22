import Knex from "knex";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import { messageHandler } from "./message-handler";
import { SQSMessage } from "./aws";
import * as PostProcessUserCreation from "./tasks/post-process-user-creation";
import * as PostProcessDeleteComment from "./tasks/post-process-delete-comment";
import * as MailchimpSubscribe from "./tasks/subscribe-to-mailchimp-users";
import * as QuotePayment from "./tasks/post-process-quote-payment/post-process-quote-payment";
import { HandlerResult } from "./types";
import Logger from "../../services/logger";

test("message handler response with error if message task type is not supported", async (t: Test) => {
  const message: SQSMessage = {
    Body: JSON.stringify({ hello: "hello world" }),
  };

  const handler = messageHandler();
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
});

test("message handler response with error if message has no Body", async (t: Test) => {
  const message: SQSMessage = {};

  const handler = messageHandler();
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
    "success response"
  );
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
});

test("message handler handles POST_PROCESS_DELETE_COMMENT", async (t: Test) => {
  const trxStub = (sandbox().stub() as unknown) as Knex.Transaction;
  sandbox().stub(db, "transaction").yields(trxStub);
  const postProcessDeleteCommentStub = sandbox()
    .stub(PostProcessDeleteComment, "postProcessDeleteComment")
    .resolves({
      type: "SUCCESS",
      message: null,
    } as HandlerResult);
  const message: SQSMessage = {
    Body: JSON.stringify({ type: "POST_PROCESS_DELETE_COMMENT" }),
  };
  const handler = messageHandler();
  const response = await handler(message);

  t.deepEqual(
    postProcessDeleteCommentStub.args,
    [
      [
        trxStub,
        {
          type: "POST_PROCESS_DELETE_COMMENT",
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
    "success response"
  );
});

test("message handler handle POST_PROCESS_DELETE_COMMENT which response with a error", async (t: Test) => {
  const trxStub = (sandbox().stub() as unknown) as Knex.Transaction;
  sandbox().stub(db, "transaction").yields(trxStub);
  const postProcessDeleteCommentStub = sandbox()
    .stub(PostProcessDeleteComment, "postProcessDeleteComment")
    .resolves({
      type: "FAILURE",
      error: new Error("Some error during processing"),
    } as HandlerResult);
  const errorLoggerStub = sandbox().stub(Logger, "logServerError");
  const message: SQSMessage = {
    Body: JSON.stringify({ type: "POST_PROCESS_DELETE_COMMENT" }),
  };
  const handler = messageHandler();
  const response = await handler(message);

  t.deepEqual(
    postProcessDeleteCommentStub.args,
    [
      [
        trxStub,
        {
          type: "POST_PROCESS_DELETE_COMMENT",
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
});

test("message handler handle POST_PROCESS_DELETE_COMMENT which throws an error", async (t: Test) => {
  const trxStub = (sandbox().stub() as unknown) as Knex.Transaction;
  sandbox().stub(db, "transaction").yields(trxStub);
  const postProcessDeleteCommentStub = sandbox()
    .stub(PostProcessDeleteComment, "postProcessDeleteComment")
    .throws(new Error("Unexpected error"));
  const errorLoggerStub = sandbox().stub(Logger, "logServerError");
  const message: SQSMessage = {
    Body: JSON.stringify({ type: "POST_PROCESS_DELETE_COMMENT" }),
  };
  const handler = messageHandler();
  const response = await handler(message);

  t.deepEqual(
    postProcessDeleteCommentStub.args,
    [
      [
        trxStub,
        {
          type: "POST_PROCESS_DELETE_COMMENT",
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
    "Error in POST_PROCESS_DELETE_COMMENT api worker task"
  );
});

test("message handler handle SUBSCRIBE_MAILCHIMP_TO_USERS", async (t: Test) => {
  const mailchimpSubscribeStub = sandbox()
    .stub(MailchimpSubscribe, "subscribeToMailchimpUsers")
    .resolves({
      type: "SUCCESS",
      message: null,
    } as HandlerResult);
  const message: SQSMessage = {
    Body: JSON.stringify({ type: "SUBSCRIBE_MAILCHIMP_TO_USERS" }),
  };
  const handler = messageHandler();
  const response = await handler(message);

  t.equal(mailchimpSubscribeStub.callCount, 1, "task has been called");

  t.deepEqual(
    mailchimpSubscribeStub.args,
    [
      [
        {
          type: "SUBSCRIBE_MAILCHIMP_TO_USERS",
        },
      ],
    ],
    "task has been called with right arguments"
  );

  t.deepEqual(
    response,
    {
      type: "SUCCESS",
      message: null,
    } as HandlerResult,
    "success response"
  );
});

test("message handler handle SUBSCRIBE_MAILCHIMP_TO_USERS unexpected thrown error", async (t: Test) => {
  const mailchimpSubscribeStub = sandbox()
    .stub(MailchimpSubscribe, "subscribeToMailchimpUsers")
    .rejects(new Error("Unexpected error"));

  const message: SQSMessage = {
    Body: JSON.stringify({ type: "SUBSCRIBE_MAILCHIMP_TO_USERS" }),
  };

  const handler = messageHandler();
  const response = await handler(message);

  t.equal(mailchimpSubscribeStub.callCount, 1, "task has been called");

  t.deepEqual(
    response,
    {
      type: "FAILURE",
      error: new Error("Unexpected error"),
    } as HandlerResult,
    "failure response"
  );
});

test("message handler handle POST_PROCESS_QUOTE_PAYMENT", async (t: Test) => {
  const quotePaymentTaskStub = sandbox()
    .stub(QuotePayment, "postProcessQuotePayment")
    .resolves({
      type: "SUCCESS",
      message: null,
    } as HandlerResult);

  const message: SQSMessage = {
    Body: JSON.stringify({ type: "POST_PROCESS_QUOTE_PAYMENT" }),
  };

  const handler = messageHandler();
  const response = await handler(message);

  t.equal(quotePaymentTaskStub.callCount, 1, "task has been called");

  t.deepEqual(
    quotePaymentTaskStub.args,
    [
      [
        {
          type: "POST_PROCESS_QUOTE_PAYMENT",
        },
      ],
    ],
    "task has been called with right arguments"
  );

  t.deepEqual(
    response,
    {
      type: "SUCCESS",
      message: null,
    } as HandlerResult,
    "success response"
  );
});

test("message handler handle POST_PROCESS_QUOTE_PAYMENT unexpected thrown error", async (t: Test) => {
  const quotePaymentTaskStub = sandbox()
    .stub(QuotePayment, "postProcessQuotePayment")
    .rejects(new Error("Unexpected error"));
  const errorLoggerStub = sandbox().stub(Logger, "logServerError");

  const message: SQSMessage = {
    Body: JSON.stringify({ type: "POST_PROCESS_QUOTE_PAYMENT" }),
  };

  const handler = messageHandler();
  const response = await handler(message);

  t.equal(quotePaymentTaskStub.callCount, 1, "task has been called");

  t.deepEqual(
    response,
    {
      type: "FAILURE",
      error: new Error("Unexpected error"),
    } as HandlerResult,
    "failure response"
  );

  t.equal(errorLoggerStub.callCount, 1, "error logger is not called");
  t.equal(
    errorLoggerStub.args[0][0],
    "Error in POST_PROCESS_QUOTE_PAYMENT api worker task"
  );
});

test("message handler handle POST_PROCESS_QUOTE_PAYMENT", async (t: Test) => {
  const quotePaymentTaskStub = sandbox()
    .stub(QuotePayment, "postProcessQuotePayment")
    .resolves({
      type: "SUCCESS",
      message: null,
    } as HandlerResult);

  const message: SQSMessage = {
    Body: JSON.stringify({ type: "POST_PROCESS_QUOTE_PAYMENT" }),
  };

  const handler = messageHandler();
  let response;
  try {
    response = await handler(message);
  } catch (e) {
    t.fail("should not throw an error");
  }

  t.equal(quotePaymentTaskStub.callCount, 1, "task has been called");

  t.deepEqual(
    quotePaymentTaskStub.args,
    [
      [
        {
          type: "POST_PROCESS_QUOTE_PAYMENT",
        },
      ],
    ],
    "task has been called with right arguments"
  );

  t.deepEqual(
    response,
    {
      type: "SUCCESS",
      message: null,
    } as HandlerResult,
    "success response"
  );
});

test("message handler handle POST_PROCESS_QUOTE_PAYMENT unexpected thrown error", async (t: Test) => {
  const quotePaymentTaskStub = sandbox()
    .stub(QuotePayment, "postProcessQuotePayment")
    .rejects(new Error("Unexpected error"));
  const errorLoggerStub = sandbox().stub(Logger, "logServerError");

  const message: SQSMessage = {
    Body: JSON.stringify({ type: "POST_PROCESS_QUOTE_PAYMENT" }),
  };

  const handler = messageHandler();
  let response;
  try {
    response = await handler(message);
  } catch (e) {
    t.fail("should not throw an error");
  }

  t.equal(quotePaymentTaskStub.callCount, 1, "task has been called");

  t.deepEqual(
    response,
    {
      type: "FAILURE",
      error: new Error("Unexpected error"),
    } as HandlerResult,
    "failure response"
  );

  t.equal(errorLoggerStub.callCount, 1, "error logger is not called");
  t.equal(
    errorLoggerStub.args[0][0],
    "Error in POST_PROCESS_QUOTE_PAYMENT api worker task"
  );
});
