import { test, Test } from "../../test-helpers/fresh";
import getLinks, { LinkType } from "./get-links";
import { STUDIO_HOST } from "../../config";
import { ComponentType } from "../components/domain-object";

test("getLinks", async () => {
  test("Subscribe with collection ID", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.Subscribe,
      returnToDesignId: null,
      returnToCollectionId: "collection-1",
      planId: "plan-1",
      invitationEmail: "foo@example.com",
      title: "A Collection",
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/subscribe?planId=plan-1&invitationEmail=foo%40example.com&returnTo=%2Fcollections%2Fcollection-1`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("A Collection"), "HTML link contains title");
  });

  test("Subscribe with design ID", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.Subscribe,
      returnToDesignId: "design-1",
      returnToCollectionId: null,
      planId: "plan-1",
      invitationEmail: "foo@example.com",
      title: "A Design",
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/subscribe?planId=plan-1&invitationEmail=foo%40example.com&returnTo=%2Fdesigns%2Fdesign-1`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("A Design"), "HTML link contains title");
  });

  test("Subscribe with neither design nor collection", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.Subscribe,
      returnToDesignId: null,
      returnToCollectionId: null,
      planId: "plan-1",
      invitationEmail: "foo@example.com",
      title: "Subscribe",
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/subscribe?planId=plan-1&invitationEmail=foo%40example.com`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Subscribe"), "HTML link contains title");
  });

  test("Design annotation link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.DesignAnnotation,
      annotationId: "8b4344b0-3746-4e28-9060-0dedc4881f6a",
      canvasId: "38eb438c-a4d4-438d-820f-1c8c5c5e24ec",
      componentType: ComponentType.Sketch,
      design: {
        id: "a-design-id",
        title: "Test design",
      },
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/designs/a-design-id?canvasId=38eb438c-a4d4-438d-820f-1c8c5c5e24ec&annotationId=8b4344b0-3746-4e28-9060-0dedc4881f6a`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test design"), "HTML link contains title");
  });

  test("Design link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.Design,
      design: {
        id: "a-design-id",
        title: "Test design",
      },
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/designs/a-design-id`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test design"), "HTML link contains title");
  });
});