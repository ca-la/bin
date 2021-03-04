import uuid from "node-uuid";

import { test, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import db from "../../services/db";

import { Page } from "./types";
import UserPageOnboardingsDAO from "./dao";

test("UserPageOnboardingsDAO.findByUser", async (t: Test) => {
  const trx = await db.transaction();
  try {
    const { user } = await createUser({ withSession: false });
    const { user: another } = await createUser({ withSession: false });
    const created = await UserPageOnboardingsDAO.createAll(trx, [
      {
        id: uuid.v4(),
        userId: user.id,
        page: Page.ALL_DESIGNS,
        viewedAt: null,
      },
      {
        id: uuid.v4(),
        userId: user.id,
        page: Page.DASHBOARD,
        viewedAt: new Date(2012, 11, 24),
      },
      {
        id: uuid.v4(),
        userId: another.id,
        page: Page.DASHBOARD,
        viewedAt: new Date(2014, 11, 24),
      },
    ]);

    t.deepEqual(
      await UserPageOnboardingsDAO.findByUser(trx, user.id),
      [
        {
          id: created[0].id,
          userId: user.id,
          page: Page.ALL_DESIGNS,
          viewedAt: null,
        },
        {
          id: created[1].id,
          userId: user.id,
          page: Page.DASHBOARD,
          viewedAt: new Date(2012, 11, 24),
        },
      ],
      "finds page onboardings by user"
    );
  } finally {
    await trx.rollback();
  }
});

test("UserPageOnboardingsDAO.findByUserAndPage", async (t: Test) => {
  const trx = await db.transaction();
  try {
    const { user } = await createUser({ withSession: false });
    const { user: another } = await createUser({ withSession: false });
    const created = await UserPageOnboardingsDAO.createAll(trx, [
      {
        id: uuid.v4(),
        userId: user.id,
        page: Page.ALL_DESIGNS,
        viewedAt: null,
      },
      {
        id: uuid.v4(),
        userId: user.id,
        page: Page.DASHBOARD,
        viewedAt: new Date(2012, 11, 24),
      },
      {
        id: uuid.v4(),
        userId: another.id,
        page: Page.DASHBOARD,
        viewedAt: new Date(2014, 11, 24),
      },
    ]);

    t.deepEqual(
      await UserPageOnboardingsDAO.findByUserAndPage(
        trx,
        user.id,
        Page.ALL_DESIGNS
      ),
      {
        id: created[0].id,
        userId: user.id,
        page: Page.ALL_DESIGNS,
        viewedAt: null,
      },
      "finds specific page onboardings by user and page"
    );
  } finally {
    await trx.rollback();
  }
});
