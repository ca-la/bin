import tape from "tape";
import { test } from "../../test-helpers/fresh";
import createUser = require("../../test-helpers/create-user");
import API from "../../test-helpers/http";
import createDesign from "../../services/create-design";

test("canDeleteDesign middleware", async (t: tape.Test) => {
  const { user } = await createUser();
  const { session: session2 } = await createUser();

  const design = await createDesign({
    productType: "HOODIE",
    title: "Robert Mapplethorpe Hoodie",
    userId: user.id,
  });

  const [validResponse] = await API.del(`/product-designs/${design.id}`, {
    headers: API.authHeader(session2.id),
  });
  t.equal(
    validResponse.status,
    403,
    "does not allow a stranger to delete a design"
  );
});
