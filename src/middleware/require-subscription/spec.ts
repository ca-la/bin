import tape from "tape";
import { test, sandbox } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import API from "../../test-helpers/http";
import config from "../../config";
import generateCollection from "../../test-helpers/factories/collection";
import { addDesign } from "../../test-helpers/collections";
import createDesign from "../../services/create-design";

test("requireSubscription middleware", async (t: tape.Test) => {
  const { user } = await createUser();
  const { session } = await createUser();

  const design = await createDesign({
    productType: "HOODIE",
    title: "Robert Mapplethorpe Hoodie",
    userId: user.id,
  });

  const { collection } = await generateCollection({
    createdBy: user.id,
  });

  await addDesign(collection.id, design.id);

  const [validResponse] = await API.post(
    `/collections/${collection.id}/submissions`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    validResponse.status,
    402,
    "does not allow an unsubscribed user to checkout"
  );
});

test("admins can submit collections", async (t: tape.Test) => {
  const { user } = await createUser();
  const ops = await createUser({ role: "ADMIN" });
  sandbox().stub(config, "CALA_OPS_USER_ID").value(ops.user.id);

  const design = await createDesign({
    productType: "HOODIE",
    title: "Robert Mapplethorpe Hoodie",
    userId: user.id,
  });

  const { collection } = await generateCollection({
    createdBy: user.id,
  });

  await addDesign(collection.id, design.id);

  const [validResponse] = await API.post(
    `/collections/${collection.id}/submissions`,
    {
      headers: API.authHeader(ops.session.id),
    }
  );

  t.equal(
    validResponse.status,
    201,
    "allows admins without subscriptions to submit"
  );
});
