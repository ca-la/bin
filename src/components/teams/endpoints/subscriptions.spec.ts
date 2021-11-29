import { sandbox, test, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import { authHeader, post } from "../../../test-helpers/http";
import { generateTeam } from "../../../test-helpers/factories/team";
import * as SubscriptionsDAO from "../../subscriptions/dao";

function buildRequest(teamId: string) {
  return {
    query: `query ($teamId: String) {
      TeamAndEnvironment(teamId: $teamId) {
        subscriptions {
          id
        }
      }
    }`,
    variables: {
      teamId,
    },
  };
}

test("TeamAndEnvironment.subscriptions calls findForTeamWithPlans", async (t: Test) => {
  const { user, session } = await createUser();
  const { team } = await generateTeam(user.id);

  sandbox()
    .stub(SubscriptionsDAO, "findForTeamWithPlans")
    .resolves([{ id: "subscription-1" }]);

  const [response, body] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      TeamAndEnvironment: {
        subscriptions: [{ id: "subscription-1" }],
      },
    },
  });
});
