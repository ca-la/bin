import uuid from "node-uuid";
import Knex from "knex";

import db from "../../services/db";
import { test, Test } from "../../test-helpers/fresh";
import PartnerPayoutAccount from "../../domain-objects/partner-payout-account";
import createUser from "../../test-helpers/create-user";
import * as PartnerPayoutAccountsDAO from "./index";
import { generateTeam } from "../../test-helpers/factories/team";
import { rawDao as RawTeamUsersDAO } from "../../components/team-users/dao";
import { Role as TeamUserRole } from "../../components/team-users/types";

async function setup() {
  const { user: partner } = await createUser({
    role: "PARTNER",
    withSession: false,
  });
  const { user: teamUser } = await createUser({
    role: "PARTNER",
    withSession: false,
  });
  const { user: deletedTeamUser } = await createUser({
    role: "PARTNER",
    withSession: false,
  });
  const { team } = await generateTeam(teamUser.id);
  await db.transaction((trx: Knex.Transaction) =>
    RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      teamId: team.id,
      userId: deletedTeamUser.id,
      userEmail: null,
      role: TeamUserRole.VIEWER,
      createdAt: new Date(),
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
  );

  const userPayoutAccount: PartnerPayoutAccount = {
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    stripeAccessToken: "a-stripe-access-token",
    stripePublishableKey: "a-stripe-publishable-key",
    stripeRefreshToken: "a-stripe-refresh-token",
    stripeUserId: "a-stripe-user-id",
    userId: partner.id,
  };
  const teamUserPayoutAccount: PartnerPayoutAccount = {
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    stripeAccessToken: "another-stripe-access-token",
    stripePublishableKey: "another-stripe-publishable-key",
    stripeRefreshToken: "another-stripe-refresh-token",
    stripeUserId: "another-stripe-user-id",
    userId: teamUser.id,
  };
  const deletedTeamUserPayoutAccount: PartnerPayoutAccount = {
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    stripeAccessToken: "another-stripe-access-token",
    stripePublishableKey: "another-stripe-publishable-key",
    stripeRefreshToken: "another-stripe-refresh-token",
    stripeUserId: "another-stripe-user-id",
    userId: deletedTeamUser.id,
  };

  return {
    users: {
      partner,
      teamUser,
      deletedTeamUser,
    },
    payoutAccounts: {
      user: await PartnerPayoutAccountsDAO.create(userPayoutAccount),
      teamUser: await PartnerPayoutAccountsDAO.create(teamUserPayoutAccount),
      deletedTeamUser: await PartnerPayoutAccountsDAO.create(
        deletedTeamUserPayoutAccount
      ),
    },
    team,
  };
}

test("PartnerPayoutAccountsDAO.findByTeamId", async (t: Test) => {
  const { team, payoutAccounts } = await setup();
  const trx = await db.transaction();

  try {
    t.deepEquals(
      await PartnerPayoutAccountsDAO.findByTeamId(trx, uuid.v4()),
      [],
      "missing team returns empty list"
    );

    t.deepEquals(
      await PartnerPayoutAccountsDAO.findByTeamId(trx, team.id),
      [payoutAccounts.teamUser],
      "found team returns team user's payout account"
    );
  } finally {
    await trx.rollback();
  }
});

test("PartnerPayoutAccountsDAO.findByUserId", async (t: Test) => {
  const { users, payoutAccounts } = await setup();

  t.deepEquals(
    await PartnerPayoutAccountsDAO.findByUserId(uuid.v4()),
    [],
    "missing user returns empty list"
  );

  t.deepEquals(
    await PartnerPayoutAccountsDAO.findByUserId(users.partner.id),
    [payoutAccounts.user],
    "found user returns user's payout account"
  );

  t.deepEquals(
    await PartnerPayoutAccountsDAO.findByUserId(users.deletedTeamUser.id),
    [payoutAccounts.deletedTeamUser],
    "found user returns user's payout account"
  );
});

test("PartnerPayoutAccountsDAO.findById", async (t: Test) => {
  const { payoutAccounts } = await setup();

  t.equals(
    await PartnerPayoutAccountsDAO.findById(uuid.v4()),
    null,
    "missing account returns null"
  );

  t.deepEquals(
    await PartnerPayoutAccountsDAO.findById(payoutAccounts.user.id),
    payoutAccounts.user,
    "found user account returns payout account"
  );

  t.deepEquals(
    await PartnerPayoutAccountsDAO.findById(payoutAccounts.teamUser.id),
    payoutAccounts.teamUser,
    "found teamUser user account returns payout account"
  );
});
