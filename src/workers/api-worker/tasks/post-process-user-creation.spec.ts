import Knex from "knex";

import { sandbox, test, Test } from "../../../test-helpers/fresh";
import { Task } from "../types";
import { postProcessUserCreation } from "./post-process-user-creation";
import TeamUsersDAO from "../../../components/team-users/dao";
import * as TeamUsersListeners from "../../../components/team-users/listeners";
import * as DesignInvitationsService from "../../../services/claim-design-invitations";
import * as DuplicationService from "../../../services/duplicate";

const task: Task<"POST_PROCESS_USER_CREATION"> = {
  deduplicationId: "a-user-id",
  type: "POST_PROCESS_USER_CREATION",
  keys: {
    userId: "a-user-id",
    email: "user@email.com",
    designIdsToDuplicate: ["a-design-1", "a-design-2"],
  },
};

test("postProcessUserCreation calls services in one transaction", async (t: Test) => {
  const trxStub = (sandbox().stub() as unknown) as Knex.Transaction;
  const claimAllTeamUsersStub = sandbox()
    .stub(TeamUsersDAO, "claimAllByEmail")
    .resolves([{ id: "an-updated-team-user" }]);
  const claimDesignInvitationsStub = sandbox()
    .stub(DesignInvitationsService, "claimDesignInvitations")
    .resolves();
  const realtimeUserTeamsUpdateStub = sandbox()
    .stub(TeamUsersListeners, "sendTeamsToUpdatedUser")
    .resolves();
  const duplicateDesignsStub = sandbox()
    .stub(DuplicationService, "duplicateDesigns")
    .resolves();

  const result = await postProcessUserCreation(trxStub, task);

  t.deepEqual(result, {
    type: "SUCCESS",
    message:
      "POST_PROCESS_USER_CREATION task successfully completed for user a-user-id.",
  });

  t.deepEqual(claimDesignInvitationsStub.args, [
    ["user@email.com", "a-user-id", trxStub],
  ]);
  t.deepEqual(claimAllTeamUsersStub.args, [
    [trxStub, "user@email.com", "a-user-id"],
  ]);
  t.deepEqual(realtimeUserTeamsUpdateStub.args, [[trxStub, "a-user-id"]]);
  t.deepEqual(duplicateDesignsStub.args, [
    ["a-user-id", ["a-design-1", "a-design-2"], trxStub],
  ]);
});

test("postProcessUserCreation doesn't call realtime update for user teams when no team users updated", async (t: Test) => {
  const trxStub = (sandbox().stub() as unknown) as Knex.Transaction;
  const claimAllTeamUsersStub = sandbox()
    .stub(TeamUsersDAO, "claimAllByEmail")
    .resolves([]);
  const claimDesignInvitationsStub = sandbox()
    .stub(DesignInvitationsService, "claimDesignInvitations")
    .resolves();
  const realtimeUserTeamsUpdateStub = sandbox()
    .stub(TeamUsersListeners, "sendTeamsToUpdatedUser")
    .resolves();
  const duplicateDesignsStub = sandbox()
    .stub(DuplicationService, "duplicateDesigns")
    .resolves();

  await postProcessUserCreation(trxStub, task);

  t.deepEqual(claimDesignInvitationsStub.args, [
    ["user@email.com", "a-user-id", trxStub],
  ]);
  t.deepEqual(claimAllTeamUsersStub.args, [
    [trxStub, "user@email.com", "a-user-id"],
  ]);
  t.equal(
    realtimeUserTeamsUpdateStub.callCount,
    0,
    "no realtime update for team users"
  );
  t.deepEqual(duplicateDesignsStub.args, [
    ["a-user-id", ["a-design-1", "a-design-2"], trxStub],
  ]);
});
