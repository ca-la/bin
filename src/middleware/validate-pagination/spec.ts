import tape from "tape";
import { test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import { authHeader, get, options } from "../../test-helpers/http";

test("validatePagination middleware", async (t: tape.Test) => {
  const { user, session } = await createUser();
  const [validResponse] = await get(
    `/teams?userId=${user.id}&limit=10&offset=20`,
    {
      headers: authHeader(session.id),
    }
  );
  t.equal(validResponse.status, 200, "allows positive offset value");

  const [negativeOffset] = await get(
    "/teams?userId=${user.id}limit=10&offset=-20",
    {
      headers: authHeader(session.id),
    }
  );
  t.equal(negativeOffset.status, 400, "disallows negative offset value");

  const [negativeRange] = await get(
    `/teams?userId={user.id}&limit=-10&offset=20`,
    {
      headers: authHeader(session.id),
    }
  );
  t.equal(negativeRange.status, 400, "disallows negative limit value");

  const [negativeOptions] = await options(
    `/teams?userId=${user.id}&limit=-10&offset=-20`,
    {
      headers: authHeader(session.id),
    }
  );
  t.equal(
    negativeOptions.status,
    204,
    "allows negative values in OPTIONS request"
  );
});
