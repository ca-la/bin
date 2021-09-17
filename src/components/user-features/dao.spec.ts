import uuid from "node-uuid";

import createUser from "../../test-helpers/create-user";
import { sandbox, test, Test, db } from "../../test-helpers/fresh";

import * as UserFeaturesDAO from "./dao";

async function setup() {
  const testDate = new Date(2012, 11, 23);
  sandbox().useFakeTimers(testDate);
  const { user } = await createUser();
  const trx = await db.transaction();

  return {
    testDate,
    user,
    trx,
  };
}

test("UserFeaturesDAO.create", async (t: Test) => {
  const { testDate, user, trx } = await setup();

  try {
    const created = await UserFeaturesDAO.create(trx, user.id, "a-new-feature");

    t.deepEqual(
      created.createdAt,
      testDate,
      "valid: returns the created feature"
    );

    const duplicate = await UserFeaturesDAO.create(
      trx,
      user.id,
      "a-new-feature"
    ).catch((err: Error) => err);

    t.true(duplicate instanceof Error, "duplicate: returns an error");
  } catch (err) {
    t.fail(err);
  } finally {
    await trx.rollback();
  }
});

test("UserFeaturesDAO.deleteByUserAndFeature", async (t: Test) => {
  const { testDate, user, trx } = await setup();

  try {
    const unknownUser = await UserFeaturesDAO.deleteByUserAndFeature(
      trx,
      uuid.v4(),
      "a-new-feature"
    ).catch((err: Error) => err);

    t.true(
      unknownUser instanceof Error,
      "unknown feature.user_id: returns an error"
    );

    await UserFeaturesDAO.create(trx, user.id, "a-new-feature");
    const unknownFeatureName = await UserFeaturesDAO.deleteByUserAndFeature(
      trx,
      user.id,
      "a-missing-feature"
    ).catch((err: Error) => err);

    t.true(
      unknownFeatureName instanceof Error,
      "unknown feature.name: returns an error"
    );

    const deleted = await UserFeaturesDAO.deleteByUserAndFeature(
      trx,
      user.id,
      "a-new-feature"
    );

    t.deepEqual(deleted.deletedAt, testDate, "valid: adds a deleted at date");
  } catch (err) {
    t.fail(err);
  } finally {
    await trx.rollback();
  }
});

test("UserFeaturesDAO end-to-end", async (t: Test) => {
  const { testDate, user, trx } = await setup();

  try {
    const empty = await UserFeaturesDAO.findNamesByUser(trx, user.id);

    t.deepEqual(empty, [], "new user with no features set");

    const created = await UserFeaturesDAO.create(trx, user.id, "a-new-feature");

    t.equal(created.name, "a-new-feature", "sets feature name");
    t.equal(created.userId, user.id, "sets user ID");
    t.equal(created.deletedAt, null, "does not set a deleted at date");

    const one = await UserFeaturesDAO.findNamesByUser(trx, user.id);

    t.deepEqual(one, ["a-new-feature"], "returns the newly added feature");

    const deleted = await UserFeaturesDAO.deleteByUserAndFeature(
      trx,
      user.id,
      "a-new-feature"
    );

    t.deepEqual(
      deleted,
      { ...created, deletedAt: testDate },
      "removal adds a deleted_at date"
    );

    const emptyAgain = await UserFeaturesDAO.findNamesByUser(trx, user.id);

    t.deepEqual(emptyAgain, [], "removed feature does not show in name list");
  } catch (err) {
    t.fail(err);
  } finally {
    await trx.rollback();
  }
});
