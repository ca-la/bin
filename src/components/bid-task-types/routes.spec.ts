import { sandbox, test, Test } from "../../test-helpers/fresh";
import createUser = require("../../test-helpers/create-user");
import { authHeader, get } from "../../test-helpers/http";
import * as TaskTemplate from "../tasks/templates";

test("GET /bid-task-types", async (t: Test) => {
  const mockTaskTypes = {
    GRADING: {
      id: "some-long-uuid-looking-thing",
      title: "Grading",
      assigneeRole: "PARTNER",
    },
    TECHNICAL_DESIGN: {
      id: "some-long-guid-looking-thing",
      title: "Technical Design",
      assigneeRole: "PARTNER",
    },
  };
  sandbox().stub(TaskTemplate, "taskTypes").value(mockTaskTypes);
  const user = await createUser();

  const [response, taskTypes] = await get("/bid-task-types", {
    headers: authHeader(user.session.id),
  });

  t.equal(response.status, 200, "Request succeeds");
  t.deepEqual(
    taskTypes,
    [mockTaskTypes.GRADING, mockTaskTypes.TECHNICAL_DESIGN],
    "Returns all Task Types as an array"
  );
});
