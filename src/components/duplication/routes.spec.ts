import API from "../../test-helpers/http";
import createUser from "../../test-helpers/create-user";
import { test, Test } from "../../test-helpers/fresh";
import createDesign from "../../services/create-design";

test("POST /duplication/designs returns 400 with bad body", async (t: Test) => {
  const { session } = await createUser();

  const [response, body] = await API.post("/duplication/designs", {
    body: {
      designIds: [true],
    },
    headers: API.authHeader(session.id),
  });

  t.equal(response.status, 400);
  t.deepEqual(body, { message: "Missing design ID list" });
});

test("POST /duplication/designs returns 400 if one or more ID is invalid", async (t: Test) => {
  const { session } = await createUser();

  const [response, body] = await API.post("/duplication/designs", {
    body: {
      designIds: ["36379007-e0cc-4b9f-8a55-7785f2da61cc"],
    },
    headers: API.authHeader(session.id),
  });

  t.equal(response.status, 400);
  t.deepEqual(body, {
    message: "Design 36379007-e0cc-4b9f-8a55-7785f2da61cc not found",
  });
});

test("POST /duplication/designs returns 403 if requested userId is not the authenticated user", async (t: Test) => {
  const { session } = await createUser();

  const [response, body] = await API.post("/duplication/designs", {
    body: {
      designIds: ["36379007-e0cc-4b9f-8a55-7785f2da61cc"],
      userId: "not the same user",
    },
    headers: API.authHeader(session.id),
  });

  t.equal(response.status, 403);
  t.deepEqual(body, {
    message: "Cannot duplicate designs for other users",
  });
});

test("POST /duplication/designs duplicates designs", async (t: Test) => {
  const { session, user } = await createUser();

  const design = await createDesign({
    title: "Green Tee",
    userId: user.id,
  });

  const [response, body] = await API.post("/duplication/designs", {
    body: {
      designIds: [design.id],
    },
    headers: API.authHeader(session.id),
  });

  t.equal(response.status, 201);
  t.equal(body.length, 1);
  t.notEqual(body[0].id, design.id);
  t.equal(body[0].title, design.title);
});

test("POST /duplication/designs duplicates designs for other users", async (t: Test) => {
  const designer = await createUser({ withSession: false });
  const other = await createUser({ withSession: false });
  const admin = await createUser({ role: "ADMIN" });

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Green Tee",
    userId: designer.user.id,
  });

  const [response, body] = await API.post("/duplication/designs", {
    body: {
      designIds: [design.id],
      userId: other.user.id,
    },
    headers: API.authHeader(admin.session.id),
  });

  t.equal(response.status, 201);
  t.equal(body.length, 1);
  t.notEqual(body[0].id, design.id);
  t.equal(body[0].title, design.title);
  t.equal(body[0].userId, other.user.id);
});

test("POST /duplication/designs duplicates designs by email", async (t: Test) => {
  const designer = await createUser();
  const other = await createUser({ withSession: false });
  const admin = await createUser({ role: "ADMIN" });

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Green Tee",
    userId: designer.user.id,
  });

  const [response, body] = await API.post("/duplication/designs", {
    body: {
      designIds: [design.id],
      email: other.user.email,
    },
    headers: API.authHeader(admin.session.id),
  });

  t.equal(response.status, 201);
  t.equal(body.length, 1);
  t.notEqual(body[0].id, design.id);
  t.equal(body[0].title, design.title);
  t.equal(body[0].userId, other.user.id);

  const [noUser] = await API.post("/duplication/designs", {
    body: {
      designIds: [design.id],
      email: "random.email@example.com",
    },
    headers: API.authHeader(admin.session.id),
  });

  t.equal(noUser.status, 404);

  const [notAdmin] = await API.post("/duplication/designs", {
    body: {
      designIds: [design.id],
      email: other.user.email,
    },
    headers: API.authHeader(designer.session.id),
  });

  t.equal(notAdmin.status, 403);
});
