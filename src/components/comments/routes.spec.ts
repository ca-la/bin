import uuid from "node-uuid";

import createUser from "../../test-helpers/create-user";
import { authHeader, del, get } from "../../test-helpers/http";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as AnnotationCommentsDAO from "../../components/annotation-comments/dao";
import generateComment from "../../test-helpers/factories/comment";
import * as ApiWorker from "../../workers/api-worker/send-message";

test("GET /comments/?annotationIds= returns comments by annotation", async (t: Test) => {
  const { session } = await createUser();

  const idOne = uuid.v4();
  const idTwo = uuid.v4();
  const idThree = uuid.v4();

  const daoStub = sandbox()
    .stub(AnnotationCommentsDAO, "findByAnnotationIds")
    .resolves([]);

  const [
    response,
    body,
  ] = await get(
    `/comments?annotationIds=${idOne}&annotationIds=${idTwo}&annotationIds=${idThree}`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200, "Successfully returns");
  t.deepEqual(body, [], "Responds with DAO return value");
  t.equal(daoStub.callCount, 1, "Stub is called exactly once");
  t.deepEqual(
    daoStub.args[0][1],
    [idOne, idTwo, idThree],
    "Calls DAO with correct annotation IDs"
  );
});

test("GET /comments/?annotationIds= returns comments by annotation even with one id", async (t: Test) => {
  const { session } = await createUser();
  const idOne = uuid.v4();
  const daoStub = sandbox()
    .stub(AnnotationCommentsDAO, "findByAnnotationIds")
    .resolves([]);

  const [response, body] = await get(`/comments?annotationIds=${idOne}`, {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 200, "Successfully returns a 200");
  t.deepEqual(body, [], "Responds with DAO return value");
  t.equal(daoStub.callCount, 1, "Stub is called exactly once");
  t.deepEqual(
    daoStub.args[0][1],
    [idOne],
    "Calls DAO with a one element array"
  );
});

test("GET /comments without annotationIds query param", async (t: Test) => {
  const { session } = await createUser();
  const daoStub = sandbox()
    .stub(AnnotationCommentsDAO, "findByAnnotationIds")
    .resolves([]);

  const [response] = await get("/comments", {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 400, "Throws an error");
  t.equal(daoStub.callCount, 0, "Stub is never called");
});

test("DELETE /comment/:id deletes a comment", async (t: Test) => {
  const { user, session } = await createUser();
  const { comment } = await generateComment();

  const sendApiWorkerMessageStub = sandbox()
    .stub(ApiWorker, "sendMessage")
    .resolves();

  const [response] = await del(`/comments/${comment.id}`, {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 204, "Comment deletion succeeds");
  t.deepEqual(
    sendApiWorkerMessageStub.args,
    [
      [
        {
          type: "POST_PROCESS_DELETE_COMMENT",
          deduplicationId: comment.id,
          keys: {
            commentId: comment.id,
            actorId: user.id,
          },
        },
      ],
    ],
    "creates API worker message with correct values"
  );
});
