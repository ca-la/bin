import { sandbox, test, Test } from "../../test-helpers/fresh";
import { post } from "../../test-helpers/http";
import createUser from "../../test-helpers/create-user";

import * as EmailService from "../../services/email";
import * as UsersDAO from "../../components/users/dao";
import SessionsDAO from "../../dao/sessions";
import { STUDIO_HOST } from "../../config";

function setup() {
  return {
    enqueueSendStub: sandbox().stub(EmailService, "enqueueSend").resolves(),
  };
}

test("POST /password-resets without email responds with 400", async (t: Test) => {
  const { enqueueSendStub } = setup();

  const [response] = await post("/password-resets", {});

  t.equal(response.status, 400, "missing required user email");
  t.deepEqual(
    enqueueSendStub.callCount,
    0,
    "notification services is not called"
  );
});

test("POST /password-resets with non-existing email responds with 400", async (t: Test) => {
  const { enqueueSendStub } = setup();
  sandbox().stub(UsersDAO, "findByEmail").resolves(null);

  const [response] = await post("/password-resets", {
    body: {
      email: "some-test-email@ca.la",
    },
  });

  t.equal(response.status, 400, "user with this email is not found");
  t.deepEqual(
    enqueueSendStub.callCount,
    0,
    "notification services is not called"
  );
});

test("POST /password-resets with non-existing email responds with 400", async (t: Test) => {
  const { enqueueSendStub } = setup();
  sandbox().stub(UsersDAO, "findByEmail").resolves(null);

  const [response] = await post("/password-resets", {
    body: {
      email: "some-test-email@ca.la",
    },
  });

  t.equal(response.status, 400, "user with this email is not found");
  t.deepEqual(
    enqueueSendStub.callCount,
    0,
    "notification services is not called"
  );
});

test("POST /password-resets responds successfully", async (t: Test) => {
  const enqueueSendStub = sandbox()
    .stub(EmailService, "enqueueSend")
    .resolves();
  const createSessionStub = sandbox()
    .stub(SessionsDAO, "createForUser")
    .resolves({
      id: "a-new-session-id",
    });
  const { user } = await createUser();

  const [response] = await post("/password-resets", {
    body: {
      email: user.email,
    },
  });

  t.equal(response.status, 204, "email has been sent");

  t.equal(
    createSessionStub.args[0][0].email,
    user.email,
    "create sessions has been called with current user"
  );

  t.deepEqual(enqueueSendStub.callCount, 1, "notification services is called");
  t.deepEqual(
    enqueueSendStub.args[0],
    [
      {
        to: user.email,
        params: {
          resetUrl: `${STUDIO_HOST}/password-reset?sessionId=a-new-session-id`,
        },
        templateName: "password_reset",
      },
    ],
    "enqueueSend has been called with right args"
  );
});
