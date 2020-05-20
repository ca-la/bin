import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as Fetch from "../fetch";
import { purgeImage } from ".";

test("purgeImage makes purge request", async (t: Test) => {
  const fetchStub = sandbox()
    .stub(Fetch, "fetch")
    .resolves({
      json: (): Promise<void> => Promise.resolve(),
      text: (): string => "hi",
      headers: {
        get: (): string => "application/json",
      },
    });

  await purgeImage("https://example.com");

  t.deepEqual(
    fetchStub.firstCall.args[0],
    "https://api.imgix.com/v2/image/purger"
  );
  const body = JSON.parse(fetchStub.firstCall.args[1].body);
  t.equal(body.url, "https://example.com");
});
