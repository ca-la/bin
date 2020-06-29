import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as FetchService from "../fetch";

import { getFetcher } from "./";

function setup() {
  const header = sandbox().stub().returns("application/json");
  const json = sandbox().stub().resolves({
    foo: "bar",
  });
  const text = sandbox().stub().resolves();
  const serializer = sandbox().stub().returns("serialized data");
  const fetch = sandbox()
    .stub(FetchService, "fetch")
    .resolves({
      headers: {
        get: header,
      },
      status: 200,
      json,
      text,
    });
  const fetcher = getFetcher({
    apiBase: "https://example.com",
    headerBase: {
      Authorization: "Basic username:password",
    },
    serializer,
  });

  return {
    stubs: {
      header,
      json,
      text,
      serializer,
      fetch,
    },
    fetcher,
  };
}

test("getFetcher GET request", async (t: Test) => {
  const { fetcher, stubs } = setup();

  const [status, body] = await fetcher({
    method: "get",
    path: "/a-path",
  });

  t.equal(status, 200, "returns status code from fetch");
  t.deepEqual(body, { foo: "bar" }, "returns body from fetch");
  t.deepEqual(
    stubs.fetch.args,
    [
      [
        "https://example.com/a-path",
        {
          method: "get",
          headers: {
            Authorization: "Basic username:password",
          },
        },
      ],
    ],
    "calls fetch with the correct arguments"
  );
  stubs.fetch.resetHistory();

  await fetcher({
    method: "get",
    path: "/a-path",
    additionalHeaders: {
      "X-Different-Header": "My cool header value",
    },
  });
  t.deepEqual(
    stubs.fetch.args,
    [
      [
        "https://example.com/a-path",
        {
          method: "get",
          headers: {
            Authorization: "Basic username:password",
            "X-Different-Header": "My cool header value",
          },
        },
      ],
    ],
    "with additional headers, calls fetch with the correct arguments"
  );
});

test("getFetcher POST request with a body", async (t: Test) => {
  const { fetcher, stubs } = setup();

  const [status, body] = await fetcher({
    method: "post",
    path: "/a-path",
    data: { foo: "bar" },
  });

  t.equal(status, 200, "returns status code from fetch");
  t.deepEqual(body, { foo: "bar" }, "returns body from fetch");
  t.deepEqual(
    stubs.fetch.args,
    [
      [
        "https://example.com/a-path",
        {
          method: "post",
          headers: {
            Authorization: "Basic username:password",
          },
          body: "serialized data",
        },
      ],
    ],
    "calls fetch with the correct arguments"
  );
  stubs.fetch.resetHistory();

  await fetcher({
    method: "post",
    path: "/a-path",
    data: { foo: "bar" },
    additionalHeaders: {
      "X-Different-Header": "My cool header value",
    },
  });

  t.deepEqual(
    stubs.fetch.args,
    [
      [
        "https://example.com/a-path",
        {
          method: "post",
          headers: {
            Authorization: "Basic username:password",
            "X-Different-Header": "My cool header value",
          },
          body: "serialized data",
        },
      ],
    ],
    "with additional headers, calls fetch with the correct arguments"
  );
});

test("getFetcher POST request without a body", async (t: Test) => {
  const { fetcher, stubs } = setup();

  const [status, body] = await fetcher({
    method: "post",
    path: "/a-path",
  });

  t.equal(status, 200, "returns status code from fetch");
  t.deepEqual(body, { foo: "bar" }, "returns body from fetch");
  t.deepEqual(
    stubs.fetch.args,
    [
      [
        "https://example.com/a-path",
        {
          method: "post",
          headers: {
            Authorization: "Basic username:password",
          },
        },
      ],
    ],
    "calls fetch with the correct arguments"
  );
});
