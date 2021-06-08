import { sandbox, test, Test } from "../../test-helpers/fresh";
import Logger from "../../services/logger";

import { HandlerResult } from "./types";
import { processMessages } from "./process-messages";
import * as AWSServices from "./aws";

test("processMessages fetch resources -> handle -> delete resources", async (t: Test) => {
  const fetchResourcesStub = sandbox()
    .stub(AWSServices, "fetchResources")
    .resolves({ message: { ReceiptHandle: "a-receipt-hadle" } });
  const handlerStub = sandbox()
    .stub()
    .resolves({ type: "SUCCESS", message: null });
  const deleteResourcesStub = sandbox()
    .stub(AWSServices, "deleteResources")
    .resolves();
  const loggerStub = sandbox().stub(Logger, "logServerError");

  await processMessages(handlerStub);

  t.equals(fetchResourcesStub.callCount, 1, "fetch resources is called");
  t.equals(handlerStub.callCount, 1, "message handler is called");
  t.equals(deleteResourcesStub.callCount, 1, "resource is deleted");
  t.equals(loggerStub.callCount, 0, "no errors thrown");
});

test("processMessages fetch resources responds without message -> resource is not deleted", async (t: Test) => {
  const fetchResourcesStub = sandbox()
    .stub(AWSServices, "fetchResources")
    .resolves({ message: null });
  const handlerStub = sandbox().stub().resolves();
  const deleteResourcesStub = sandbox()
    .stub(AWSServices, "deleteResources")
    .resolves();
  const loggerStub = sandbox().stub(Logger, "logServerError");

  await processMessages(handlerStub);

  t.equals(fetchResourcesStub.callCount, 1, "fetch resources is called");
  t.equals(loggerStub.callCount, 0, "no errors thrown");
  t.equals(handlerStub.callCount, 0, "message handler is not called");
  t.equals(deleteResourcesStub.callCount, 0, "resource is not deleted");
});

test("processMessages fetch resources throws error -> resource is not deleted", async (t: Test) => {
  const fetchResourcesStub = sandbox()
    .stub(AWSServices, "fetchResources")
    .throws();
  const handlerStub = sandbox().stub().resolves();
  const deleteResourcesStub = sandbox()
    .stub(AWSServices, "deleteResources")
    .resolves();
  const loggerStub = sandbox().stub(Logger, "logServerError");

  await processMessages(handlerStub);

  t.equals(fetchResourcesStub.callCount, 1, "fetch resources is called");
  t.equals(loggerStub.callCount, 1, "log the error");
  t.deepEqual(loggerStub.args[0][0], "Error in fetchResources: ");
  t.equals(handlerStub.callCount, 0, "message handler is not called");
  t.equals(deleteResourcesStub.callCount, 0, "resouce is not deleted");
});

test("processMessages message handler throws error -> resource is not deleted", async (t: Test) => {
  const fetchResourcesStub = sandbox()
    .stub(AWSServices, "fetchResources")
    .resolves({ message: { ReceiptHandle: "a-receipt-hadle" } });
  const handlerStub = sandbox().stub().throws();
  const deleteResourcesStub = sandbox()
    .stub(AWSServices, "deleteResources")
    .resolves();
  const loggerStub = sandbox().stub(Logger, "logServerError");

  await processMessages(handlerStub);

  t.equals(fetchResourcesStub.callCount, 1, "fetch resources is called");
  t.equals(handlerStub.callCount, 1, "message handler is called");
  t.equals(loggerStub.callCount, 1, "log the error");
  t.deepEqual(
    loggerStub.args[0][0],
    "Message handler error (we will retry this message): "
  );
  t.equals(deleteResourcesStub.callCount, 0, "resource is not deleted");
});

test("processMessages message handler throws error we don't want to retry-> resource is deleted", async (t: Test) => {
  const fetchResourcesStub = sandbox()
    .stub(AWSServices, "fetchResources")
    .resolves({ message: { ReceiptHandle: "a-receipt-hadle" } });
  const handlerStub = sandbox()
    .stub()
    .resolves({
      type: "FAILURE_DO_NOT_RETRY",
      error: new Error("This email does not exist"),
    } as HandlerResult);
  const deleteResourcesStub = sandbox()
    .stub(AWSServices, "deleteResources")
    .resolves();
  const loggerStub = sandbox().stub(Logger, "logServerError");

  await processMessages(handlerStub);

  t.equals(fetchResourcesStub.callCount, 1, "fetch resources is called");
  t.equals(handlerStub.callCount, 1, "message handler is called");
  t.equals(loggerStub.callCount, 1, "log the error");
  t.deepEqual(
    loggerStub.args[0][0],
    "Message handler error (we won't retry this message): "
  );
  t.equals(deleteResourcesStub.callCount, 1, "resource is deleted");
});

test("processMessages message handler response with error and we want to retry-> resource is not deleted", async (t: Test) => {
  const fetchResourcesStub = sandbox()
    .stub(AWSServices, "fetchResources")
    .resolves({ message: { ReceiptHandle: "a-receipt-hadle" } });
  const handlerStub = sandbox()
    .stub()
    .resolves({
      type: "FAILURE",
      error: new Error("This email does not exist"),
    } as HandlerResult);
  const deleteResourcesStub = sandbox()
    .stub(AWSServices, "deleteResources")
    .resolves();
  const loggerStub = sandbox().stub(Logger, "logServerError");

  await processMessages(handlerStub);

  t.equals(fetchResourcesStub.callCount, 1, "fetch resources is called");
  t.equals(handlerStub.callCount, 1, "message handler is called");
  t.equals(loggerStub.callCount, 1, "log the error");
  t.deepEqual(
    loggerStub.args[0][0],
    "Message handler error (we will retry this message): "
  );
  t.equals(deleteResourcesStub.callCount, 0, "resource is not deleted");
});

test("processMessages message handler response with SUCCESS and the message", async (t: Test) => {
  sandbox()
    .stub(AWSServices, "fetchResources")
    .resolves({ message: { ReceiptHandle: "a-receipt-hadle" } });
  const handlerStub = sandbox()
    .stub()
    .resolves({
      type: "SUCCESS",
      message: null,
    } as HandlerResult);
  sandbox().stub(AWSServices, "deleteResources").resolves();
  const loggerStub = sandbox().stub(Logger, "log");

  await processMessages(handlerStub);

  t.equal(loggerStub.callCount, 0, "log is not called with null message value");

  handlerStub.resolves({
    type: "SUCCESS",
    message: "We successfuly send the message to the Mailchimp",
  } as HandlerResult);
  await processMessages(handlerStub);

  t.equal(
    loggerStub.callCount,
    1,
    "is callded when handler response with the message"
  );
  t.deepEqual(
    loggerStub.args[0][0],
    "We successfuly send the message to the Mailchimp"
  );
});

test("processMessages logs error if message doesn't contain ReceiptHandle", async (t: Test) => {
  const fetchResourcesStub = sandbox()
    .stub(AWSServices, "fetchResources")
    .resolves({ message: { MessageId: "a-message-id" } });
  const handlerStub = sandbox().stub().resolves({
    type: "SUCCESS",
    message: null,
  });
  const deleteResourcesStub = sandbox()
    .stub(AWSServices, "deleteResources")
    .resolves();
  const loggerStub = sandbox().stub(Logger, "logServerError");

  await processMessages(handlerStub);

  t.equals(fetchResourcesStub.callCount, 1, "fetch resources is called");
  t.equals(handlerStub.callCount, 1, "message handler is called");
  t.equals(loggerStub.callCount, 1, "log the error");
  t.deepEqual(
    loggerStub.args[0][0],
    "Message a-message-id does not contain a ReceiptHandle!"
  );
  t.equals(deleteResourcesStub.callCount, 0, "deleteResources is not called");
});

test("processMessages logs error on delete resources", async (t: Test) => {
  const fetchResourcesStub = sandbox()
    .stub(AWSServices, "fetchResources")
    .resolves({
      message: { MessageId: "a-message-id", ReceiptHandle: "a-receipt-handle" },
    });
  const handlerStub = sandbox().stub().resolves({
    type: "SUCCESS",
    message: null,
  });
  const deleteResourcesStub = sandbox()
    .stub(AWSServices, "deleteResources")
    .throws();
  const loggerStub = sandbox().stub(Logger, "logServerError");

  await processMessages(handlerStub);

  t.equals(fetchResourcesStub.callCount, 1, "fetch resources is called");
  t.equals(handlerStub.callCount, 1, "message handler is called");
  t.equals(loggerStub.callCount, 1, "log the error");
  t.deepEqual(loggerStub.args[0][0], "Error in deleteResources: ");
  t.equals(deleteResourcesStub.callCount, 1, "deleteResources is called");
});
