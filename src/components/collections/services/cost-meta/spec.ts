import { pick } from "lodash";

import { test, Test, db } from "../../../../test-helpers/fresh";

import { generateTeamUser } from "../../../../test-helpers/factories/team-user";
import generateCollection from "../../../../test-helpers/factories/collection";
import { Role as TeamUserRole } from "../../../team-users/types";
import { costCollection } from "../../../../test-helpers/cost-collection";
import { submitCollection } from "../../../../test-helpers/submit-collection";
import { checkout as checkoutCollection } from "../../../../test-helpers/checkout-collection";
import { getCostedAndSubmittedCollections, getCollectionCartDetails } from ".";

test("getCostedAndSubmittedCollections", async (t: Test) => {
  // create submitted collection
  const {
    user: { designer },
    collection: submittedCollection,
  } = await submitCollection(false);

  // create costed collection
  const {
    team: costCollectionTeam,
    collection: costedCollection,
  } = await costCollection();

  // create collection after checkout to make sure we don't return them
  const { team: checkoutCollectionTeam } = await checkoutCollection(false);

  // add designer to a costed collection team
  await generateTeamUser({
    userId: designer.user.id,
    teamId: costCollectionTeam.id,
    role: TeamUserRole.EDITOR,
  });
  // add designer to a checked out collection team
  await generateTeamUser({
    userId: designer.user.id,
    teamId: checkoutCollectionTeam.id,
    role: TeamUserRole.EDITOR,
  });

  // create designer owned blank collection
  await generateCollection({
    createdBy: designer.user.id,
    teamId: costCollectionTeam.id,
  });

  const getCollections = await getCostedAndSubmittedCollections(db, {
    userId: designer.user.id,
    role: designer.user.role,
  });

  t.equal(
    getCollections.length,
    2,
    "returns only costed and submitted collections"
  );

  const receivedCostedCollection = getCollections[0];
  t.deepEqual(
    pick(receivedCostedCollection, "id", "cartStatus"),
    {
      id: costedCollection.id,
      cartStatus: "COSTED",
    },
    "returns costed collection"
  );
  t.true(
    receivedCostedCollection.hasOwnProperty("cartSubtotal"),
    "costed collection has cartSubtotal"
  );
  t.equal(
    receivedCostedCollection.cartStatus === "COSTED"
      ? receivedCostedCollection.cartSubtotal.subtotalCents
      : undefined,
    710600,
    "costed collection cartSubtotal subtotalCents matches expected value"
  );

  const receivedSubmittedCollection = getCollections[1];
  t.deepEqual(
    pick(receivedSubmittedCollection, "id", "cartStatus"),
    {
      id: submittedCollection.id,
      cartStatus: "SUBMITTED",
    },
    "returns submitted collection"
  );
});

test("getCollectionCartDetails returns cart details for costed collection", async (t: Test) => {
  // create costed collection
  const { collection: costedCollection } = await costCollection();

  const costedCollectionCartDetails = await getCollectionCartDetails(
    db,
    costedCollection.id
  );

  if (costedCollectionCartDetails === null) {
    throw new Error(
      "getCollectionCartDetails doesn't return cart details for costed collection"
    );
  }
  t.deepEqual(
    pick(costedCollectionCartDetails, "id", "cartStatus"),
    {
      id: costedCollection.id,
      cartStatus: "COSTED",
    },
    "returns costed collection cart details"
  );
  t.true(
    costedCollectionCartDetails.hasOwnProperty("cartSubtotal"),
    "costed collection has cartSubtotal"
  );
  t.equal(
    costedCollectionCartDetails.cartStatus === "COSTED"
      ? costedCollectionCartDetails.cartSubtotal.subtotalCents
      : undefined,
    710600,
    "costed collection cartSubtotal subtotalCents matches expected value"
  );
});

test("getCollectionCartDetails returns cart details for submitted collection", async (t: Test) => {
  const { collection: submittedCollection } = await submitCollection(false);

  const submittedCollectionCartDetails = await getCollectionCartDetails(
    db,
    submittedCollection.id
  );

  if (submittedCollectionCartDetails === null) {
    throw new Error(
      "getCollectionCartDetails doesn't return cart details for submitted collection"
    );
  }
  t.deepEqual(
    pick(submittedCollectionCartDetails, "id", "cartStatus"),
    {
      id: submittedCollection.id,
      cartStatus: "SUBMITTED",
    },
    "returns submitted collection cart details"
  );
});

test("getCollectionCartDetails returns null for not submitted/costed collection", async (t: Test) => {
  const { collection } = await generateCollection();

  const collectionCartDetails = await getCollectionCartDetails(
    db,
    collection.id
  );

  t.is(
    collectionCartDetails,
    null,
    "not submitted/costed collection has no cart details"
  );
});
