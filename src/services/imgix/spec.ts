import { sandbox, test, Test } from "../../test-helpers/fresh";
import { USER_UPLOADS_IMGIX_URL } from "../../config";
import * as Fetch from "../fetch";
import { purgeImage, getPageCount } from ".";

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
    "https://api.imgix.com/api/v1/purge"
  );
  const body = JSON.parse(fetchStub.firstCall.args[1].body);
  t.deepEqual(
    body,
    {
      data: {
        attributes: {
          url: "https://example.com",
        },
        type: "purges",
      },
    },
    "request body is correct"
  );
});

test("getPageCount counts pages", async (t: Test) => {
  const fetchStub = sandbox()
    .stub(Fetch, "fetch")
    .resolves({
      json: (): Promise<object> =>
        Promise.resolve({
          PDF: {
            PageCount: 2,
          },
        }),
      headers: {
        get: (): string => "application/json",
      },
    });

  const pages = await getPageCount("asset-id");
  t.equal(pages, 2);

  t.deepEqual(
    fetchStub.firstCall.args[0],
    `${USER_UPLOADS_IMGIX_URL}/asset-id?fm=json`
  );
});

test("getPageCount throws if Imgix returns non-JSON", async (t: Test) => {
  sandbox()
    .stub(Fetch, "fetch")
    .resolves({
      text: (): Promise<string> => Promise.resolve("heyo"),
      headers: {
        get: (): string => "text/plain",
      },
      status: 200,
    });

  try {
    await getPageCount("asset-id");
  } catch (err) {
    t.equal(err.message, "Unexpected Imgix response type: text/plain");
    t.equal(err.status, 200);
  }
});
