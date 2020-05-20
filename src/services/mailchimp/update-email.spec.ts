import MailChimp from "./index";
import { updateEmail } from "./update-email";
import InvalidDataError = require("../../errors/invalid-data");
import { sandbox, test, Test } from "../../test-helpers/fresh";

test("MailChimp.updateEmail calls update for each email list", async (t: Test) => {
  const makeRequestStub = sandbox().stub(MailChimp, "makeRequest").resolves();

  await updateEmail("oldEmail", "newEmail");
  t.equal(makeRequestStub.callCount, 3);
});

test("MailChimp.updateEmail throws on non-404 errors", async (t: Test) => {
  sandbox()
    .stub(MailChimp, "makeRequest")
    .callsFake(() => {
      throw new InvalidDataError("A new failure");
    });

  try {
    await updateEmail("oldEmail", "newEmail");
    t.fail("Did not throw");
  } catch (error) {
    t.pass("Correctly threw non-404");
  }
});
