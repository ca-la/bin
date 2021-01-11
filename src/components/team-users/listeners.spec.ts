import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import * as IrisService from "../iris/send-message";
import { listeners } from "./listeners";
import {
  RouteCreated,
  RouteUpdated,
  RouteDeleted,
} from "../../services/pubsub/cala-events";
import TeamUsersDAO from "./dao";
import {
  Role as TeamUserRole,
  TeamUser,
  teamUserDomain,
  TeamUserDb,
} from "./types";
import { baseUser } from "../users/domain-object";

const now = new Date();

const tuDb1: TeamUserDb = {
  id: "a-team-user-id",
  teamId: "a-team-id",
  userId: "a-user-id",
  userEmail: null,
  role: TeamUserRole.ADMIN,
  createdAt: now,
  deletedAt: null,
  updatedAt: now,
};
const tu1: TeamUser = {
  ...tuDb1,
  user: {
    ...baseUser,
    createdAt: now,
    id: "a-user-id",
    name: "The First User",
  },
};

const tu2: TeamUser = {
  ...tuDb1,
  id: "a-team-user-id-2",
  userId: "a-user-id-2",
  user: {
    ...baseUser,
    createdAt: now,
    id: "a-user-id-2",
    name: "The Second User",
  },
};

function setup() {
  return {
    uuidStub: sandbox().stub(uuid, "v4").returns("uuid"),
    findTeamUsersStub: sandbox()
      .stub(TeamUsersDAO, "find")
      .resolves([tu1, tu2]),
    irisStub: sandbox().stub(IrisService, "sendMessage").resolves(),
    clock: sandbox().useFakeTimers(now),
  };
}

test("route.created", async (t: Test) => {
  const { irisStub } = setup();

  const trx = await db.transaction();

  try {
    const event: RouteCreated<TeamUser, typeof teamUserDomain> = {
      trx,
      type: "route.created",
      domain: teamUserDomain,
      actorId: "actor-id",
      created: tu1,
    };

    if (!listeners["route.created"]) {
      throw new Error("route.created is empty");
    }

    await listeners["route.created"](event);

    t.deepEquals(
      irisStub.args[0][0],
      {
        type: "team-users-list/updated",
        resource: [tu1, tu2],
        channels: ["teams/a-team-id"],
      },
      "Send list of team users via realtime on team user create"
    );
  } finally {
    await trx.rollback();
  }
});

test("route.updated", async (t: Test) => {
  const { irisStub } = setup();

  const trx = await db.transaction();

  try {
    const event: RouteUpdated<TeamUser, typeof teamUserDomain> = {
      trx,
      type: "route.updated",
      domain: teamUserDomain,
      actorId: "actor-id",
      before: tu1,
      updated: tu1,
    };

    if (!listeners["route.updated"]) {
      throw new Error("route.updated is empty");
    }

    await listeners["route.updated"](event);

    t.deepEquals(
      irisStub.args[0][0],
      {
        type: "team-users-list/updated",
        resource: [tu1, tu2],
        channels: ["teams/a-team-id"],
      },
      "Send list of team users via realtime on team user update"
    );
  } finally {
    await trx.rollback();
  }
});

test("route.deleted", async (t: Test) => {
  const { irisStub } = setup();

  const trx = await db.transaction();

  try {
    const event: RouteDeleted<TeamUser, typeof teamUserDomain> = {
      trx,
      type: "route.deleted",
      domain: teamUserDomain,
      actorId: "actor-id",
      deleted: tu1,
    };

    if (!listeners["route.deleted"]) {
      throw new Error("route.deleted is empty");
    }

    await listeners["route.deleted"](event);

    t.deepEquals(
      irisStub.args[0][0],
      {
        type: "team-users-list/updated",
        resource: [tu1, tu2],
        channels: ["teams/a-team-id"],
      },
      "Send list of team users via realtime on team user delete"
    );
  } finally {
    await trx.rollback();
  }
});