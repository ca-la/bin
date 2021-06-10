import { sandbox, test, Test } from "../../../test-helpers/fresh";
import { Task, HandlerResult } from "../types";
import Mailchimp from "../../../services/mailchimp";
import { subscribeToMailchimpUsers as subscribeToMailchimpUsersTask } from "./subscribe-to-mailchimp-users";
import ThirdPartyCallError from "../../../errors/third-party-call-error";

const task: Task<"SUBSCRIBE_MAILCHIMP_TO_USERS"> = {
  deduplicationId: "a-user-id",
  type: "SUBSCRIBE_MAILCHIMP_TO_USERS",
  keys: {
    cohort: "moma-demo-june-2020",
    name: "A user name",
    email: "user+some@email.com",
    referralCode: "CODE",
  },
};

test("subscribeToMailchimpUsers success", async (t: Test) => {
  const subscribeToUsersStub = sandbox()
    .stub(Mailchimp, "subscribeToUsers")
    .resolves();

  const taskResponse = await subscribeToMailchimpUsersTask(task);

  t.deepEqual(
    subscribeToUsersStub.args,
    [
      [
        {
          cohort: "moma-demo-june-2020",
          email: "user+some@email.com",
          name: "A user name",
          referralCode: "CODE",
        },
      ],
    ],
    "mailchimp service function has been called with correct args"
  );
  t.deepEqual(
    taskResponse,
    {
      type: "SUCCESS",
      message:
        "SUBSCRIBE_MAILCHIMP_TO_USERS task successfully completed for user user+some@email.com.",
    } as HandlerResult,
    "don't need to retry successful task"
  );
});

test("subscribeToMailchimpUsers response to retry on failure then Mailchimp service throws ThirdPartyCallError with Too Many Requests code 429", async (t: Test) => {
  sandbox()
    .stub(Mailchimp, "subscribeToUsers")
    .rejects(new ThirdPartyCallError("Too many requests", 429));

  const taskResponse = await subscribeToMailchimpUsersTask(task);

  t.deepEqual(
    taskResponse,
    {
      type: "FAILURE",
      error: new Error(
        "Failed to sign up user to Mailchimp: user+some@email.com - Too many requests."
      ),
    } as HandlerResult,
    "response with the FAILURE to retry the message on Too many requests error"
  );
});

test("subscribeToMailchimpUsers response to retry on failure then Mailchimp service throws ThirdPartyCallError with 500 code", async (t: Test) => {
  sandbox()
    .stub(Mailchimp, "subscribeToUsers")
    .rejects(new ThirdPartyCallError("Server error", 500));

  const taskResponse = await subscribeToMailchimpUsersTask(task);

  t.deepEqual(
    taskResponse,
    {
      type: "FAILURE",
      error: new Error(
        "Failed to sign up user to Mailchimp: user+some@email.com - Server error."
      ),
    } as HandlerResult,
    "response with the FAILURE to retry the message on Maichimp server error"
  );
});

test("subscribeToMailchimpUsers response to not retry on failure then Mailchimp service throws ThirdPartyCallError with code 400", async (t: Test) => {
  sandbox()
    .stub(Mailchimp, "subscribeToUsers")
    .rejects(new ThirdPartyCallError("Invalid Resource", 400));

  const taskResponse = await subscribeToMailchimpUsersTask(task);

  t.deepEqual(
    taskResponse,
    {
      type: "FAILURE_DO_NOT_RETRY",
      error: new Error(
        "Failed to sign up user to Mailchimp: user+some@email.com - Invalid Resource."
      ),
    } as HandlerResult,
    "response with the FAILURE_DO_NOT_RETRY on Maichimp invalid resource error "
  );
});
