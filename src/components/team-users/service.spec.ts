import tape from "tape";

import db from "../../services/db";
import { test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import generateCollection from "../../test-helpers/factories/collection";
import { generateTeam } from "../../test-helpers/factories/team";
import { generateTeamUser } from "../../test-helpers/factories/team-user";
import { Role as TeamUserRole } from "./types";

import * as TeamUsersService from "./service";

test("canUserMoveCollectionBetweenTeams", async (t: tape.Test) => {
  const teamOwnerUser = await createUser();
  const { team } = await generateTeam(teamOwnerUser.user.id);
  const { team: teamToMoveCollectionTo } = await generateTeam(
    teamOwnerUser.user.id
  );

  const trx = await db.transaction();

  try {
    const { collection } = await generateCollection(
      {
        teamId: team.id,
      },
      trx
    );

    const { user: userWithinTheTeamFrom } = await generateTeamUser(
      { teamId: team.id, role: TeamUserRole.OWNER },
      { trx, withUser: true }
    );

    t.notOk(
      await TeamUsersService.canUserMoveCollectionBetweenTeams({
        trx,
        collectionId: collection.id,
        userId: userWithinTheTeamFrom!.user.id,
        teamIdToMoveTo: teamToMoveCollectionTo.id,
      }),
      "user can't move collection to a team the user is not a member of"
    );

    const { user: userWithinTheTeamTo } = await generateTeamUser(
      { teamId: teamToMoveCollectionTo.id, role: TeamUserRole.OWNER },
      { trx, withUser: true }
    );

    t.notOk(
      await TeamUsersService.canUserMoveCollectionBetweenTeams({
        trx,
        collectionId: collection.id,
        userId: userWithinTheTeamTo!.user.id,
        teamIdToMoveTo: teamToMoveCollectionTo.id,
      }),
      "user can't move collection from the team the user is no a member of"
    );

    interface CanMoveDependsOnUserRolesInTeamsTestCase {
      userRoleInTeamFrom: TeamUserRole;
      userRoleInTeamTo: TeamUserRole;
      canMove: boolean;
    }

    const testCases: CanMoveDependsOnUserRolesInTeamsTestCase[] = [
      {
        userRoleInTeamFrom: TeamUserRole.VIEWER,
        userRoleInTeamTo: TeamUserRole.VIEWER,
        canMove: false,
      },
      {
        userRoleInTeamFrom: TeamUserRole.VIEWER,
        userRoleInTeamTo: TeamUserRole.EDITOR,
        canMove: false,
      },
      {
        userRoleInTeamFrom: TeamUserRole.VIEWER,
        userRoleInTeamTo: TeamUserRole.ADMIN,
        canMove: false,
      },
      {
        userRoleInTeamFrom: TeamUserRole.VIEWER,
        userRoleInTeamTo: TeamUserRole.OWNER,
        canMove: false,
      },
      {
        userRoleInTeamFrom: TeamUserRole.EDITOR,
        userRoleInTeamTo: TeamUserRole.VIEWER,
        canMove: false,
      },
      {
        userRoleInTeamFrom: TeamUserRole.ADMIN,
        userRoleInTeamTo: TeamUserRole.VIEWER,
        canMove: false,
      },
      {
        userRoleInTeamFrom: TeamUserRole.OWNER,
        userRoleInTeamTo: TeamUserRole.VIEWER,
        canMove: false,
      },
      {
        userRoleInTeamFrom: TeamUserRole.EDITOR,
        userRoleInTeamTo: TeamUserRole.EDITOR,
        canMove: true,
      },
      {
        userRoleInTeamFrom: TeamUserRole.EDITOR,
        userRoleInTeamTo: TeamUserRole.ADMIN,
        canMove: true,
      },
      {
        userRoleInTeamFrom: TeamUserRole.EDITOR,
        userRoleInTeamTo: TeamUserRole.OWNER,
        canMove: true,
      },
      {
        userRoleInTeamFrom: TeamUserRole.ADMIN,
        userRoleInTeamTo: TeamUserRole.EDITOR,
        canMove: true,
      },
      {
        userRoleInTeamFrom: TeamUserRole.OWNER,
        userRoleInTeamTo: TeamUserRole.EDITOR,
        canMove: true,
      },
      {
        userRoleInTeamFrom: TeamUserRole.ADMIN,
        userRoleInTeamTo: TeamUserRole.ADMIN,
        canMove: true,
      },
      {
        userRoleInTeamFrom: TeamUserRole.ADMIN,
        userRoleInTeamTo: TeamUserRole.OWNER,
        canMove: true,
      },
      {
        userRoleInTeamFrom: TeamUserRole.OWNER,
        userRoleInTeamTo: TeamUserRole.ADMIN,
        canMove: true,
      },
      {
        userRoleInTeamFrom: TeamUserRole.ADMIN,
        userRoleInTeamTo: TeamUserRole.ADMIN,
        canMove: true,
      },
    ];

    for (const testCase of testCases) {
      const { user: userData } = await generateTeamUser(
        { teamId: team.id, role: testCase.userRoleInTeamFrom },
        { trx, withUser: true }
      );
      await generateTeamUser({
        teamId: teamToMoveCollectionTo.id,
        role: testCase.userRoleInTeamTo,
        userId: userData!.user.id,
      });

      t.equal(
        await TeamUsersService.canUserMoveCollectionBetweenTeams({
          trx,
          collectionId: collection.id,
          userId: userData!.user.id,
          teamIdToMoveTo: teamToMoveCollectionTo.id,
        }),
        testCase.canMove,
        `user can${
          testCase.canMove ? "" : "'t"
        } move the collection between teams if the user is the ${
          testCase.userRoleInTeamFrom
        } in one team and the ${testCase.userRoleInTeamTo} in another`
      );
    }
  } finally {
    trx.rollback();
  }
});
