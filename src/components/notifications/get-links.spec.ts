import { test, Test } from "../../test-helpers/fresh";
import getLinks, { LinkType } from "./get-links";
import { STUDIO_HOST } from "../../config";
import { ComponentType } from "../components/types";

test("getLinks", async () => {
  test("Subscribe with collection ID", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.Subscribe,
      returnToDesignId: null,
      returnToCollectionId: "collection-1",
      returnToTeamId: null,
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
      returnToTeamId: null,
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

  test("Subscribe with team ID", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.Subscribe,
      returnToDesignId: "design-1",
      returnToCollectionId: null,
      returnToTeamId: "team-1",
      planId: "plan-1",
      invitationEmail: "foo@example.com",
      title: "A Team",
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/subscribe?planId=plan-1&invitationEmail=foo%40example.com&returnTo=%2Fteams%2Fteam-1`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("A Team"), "HTML link contains title");
  });

  test("Subscribe with no redirect", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.Subscribe,
      returnToDesignId: null,
      returnToCollectionId: null,
      returnToTeamId: null,
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

  test("Design annotation artwork tab link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.DesignAnnotation,
      annotationId: "8b4344b0-3746-4e28-9060-0dedc4881f6a",
      canvasId: "38eb438c-a4d4-438d-820f-1c8c5c5e24ec",
      componentType: ComponentType.Artwork,
      design: {
        id: "a-design-id",
        title: "Test design",
      },
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/designs/a-design-id?tab=artwork&canvasId=38eb438c-a4d4-438d-820f-1c8c5c5e24ec&annotationId=8b4344b0-3746-4e28-9060-0dedc4881f6a`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test design"), "HTML link contains title");
  });

  test("Design annotation materials tab link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.DesignAnnotation,
      annotationId: "8b4344b0-3746-4e28-9060-0dedc4881f6a",
      canvasId: "38eb438c-a4d4-438d-820f-1c8c5c5e24ec",
      componentType: ComponentType.Material,
      design: {
        id: "a-design-id",
        title: "Test design",
      },
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/designs/a-design-id?tab=materials&canvasId=38eb438c-a4d4-438d-820f-1c8c5c5e24ec&annotationId=8b4344b0-3746-4e28-9060-0dedc4881f6a`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test design"), "HTML link contains title");
  });

  test("Design annotation comment link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.DesignAnnotation,
      annotationId: "8b4344b0-3746-4e28-9060-0dedc4881f6a",
      canvasId: "38eb438c-a4d4-438d-820f-1c8c5c5e24ec",
      componentType: ComponentType.Material,
      design: {
        id: "a-design-id",
        title: "Test design",
      },
      commentId: "a-comment-id",
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/designs/a-design-id?tab=materials&canvasId=38eb438c-a4d4-438d-820f-1c8c5c5e24ec&annotationId=8b4344b0-3746-4e28-9060-0dedc4881f6a&replyingToCommentId=a-comment-id`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test design"), "HTML link contains title");
  });

  test("Collection Design task link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.CollectionDesignTask,
      task: {
        id: "a-task-id",
        title: "Test task",
      },
      collection: {
        id: "a-collection-id",
        title: "Test collection",
      },
      design: {
        id: "a-design-id",
        title: "Test design",
      },
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/tasks?taskId=a-task-id&designId=a-design-id`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test task"), "HTML link contains title");
  });

  test("Collection Design task link with comment", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.CollectionDesignTask,
      task: {
        id: "a-task-id",
        title: "Test task",
      },
      collection: {
        id: "a-collection-id",
        title: "Test collection",
      },
      design: {
        id: "a-design-id",
        title: "Test design",
      },
      commentId: "a-comment-id",
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/tasks?taskId=a-task-id&designId=a-design-id&replyingToCommentId=a-comment-id`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test task"), "HTML link contains title");
  });

  test("Collection Design link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.CollectionDesign,
      collection: {
        id: "a-collection-id",
        title: "Test collection",
      },
      design: {
        id: "a-design-id",
        title: "Test design",
      },
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/collections/a-collection-id/designs?previewDesignId=a-design-id`,
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

  test("Partner design link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.PartnerDesign,
      design: {
        id: "a-design-id",
        title: "Test design",
      },
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/partners?previewDesignId=a-design-id`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test design"), "HTML link contains title");
  });

  test("Collection link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.Collection,
      collection: {
        id: "a-collection-id",
        title: "Test collection",
      },
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/collections/a-collection-id/designs`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test collection"), "HTML link contains title");
  });

  test("Collection isCheckout link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.Collection,
      collection: {
        id: "a-collection-id",
        title: "Test collection",
      },
      isCheckout: true,
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/collections/a-collection-id/designs?isCheckout=true`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test collection"), "HTML link contains title");
  });

  test("Collection isSubmit link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.Collection,
      collection: {
        id: "a-collection-id",
        title: "Test collection",
      },
      isSubmit: true,
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/collections/a-collection-id/designs?isSubmit=true`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test collection"), "HTML link contains title");
  });

  test("Submission link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.ApprovalStepSubmission,
      design: {
        id: "a-design-id",
        title: "Test design",
      },
      approvalStep: {
        id: "a-step-id",
        title: "Test step",
      },
      approvalSubmission: {
        id: "a-submission-id",
        title: "Test submission",
      },
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/dashboard?designId=a-design-id&stepId=a-step-id&submissionId=a-submission-id`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test submission"), "HTML link contains title");
  });

  test("Submission comment link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.ApprovalStepSubmission,
      design: {
        id: "a-design-id",
        title: "Test design",
      },
      approvalStep: {
        id: "a-step-id",
        title: "Test step",
      },
      approvalSubmission: {
        id: "a-submission-id",
        title: "Test submission",
      },
      commentId: "a-comment-id",
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/dashboard?designId=a-design-id&stepId=a-step-id&submissionId=a-submission-id&replyingToCommentId=a-comment-id`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test submission"), "HTML link contains title");
  });

  test("Approval step link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.ApprovalStep,
      design: {
        id: "a-design-id",
        title: "Test design",
      },
      approvalStep: {
        id: "a-step-id",
        title: "Test step",
      },
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/dashboard?designId=a-design-id&stepId=a-step-id`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test step"), "HTML link contains title");
  });

  test("Approval step comment link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.ApprovalStep,
      design: {
        id: "a-design-id",
        title: "Test design",
      },
      approvalStep: {
        id: "a-step-id",
        title: "Test step",
      },
      commentId: "a-comment-id",
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/dashboard?designId=a-design-id&stepId=a-step-id&replyingToCommentId=a-comment-id`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test step"), "HTML link contains title");
  });

  test("Shipment tracking link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.ShipmentTracking,
      design: {
        id: "a-design-id",
        title: "Test design",
      },
      approvalStep: {
        id: "a-step-id",
        title: "Test step",
      },
      shipmentTrackingId: "a-tracking-id",
    });

    t.equal(
      deepLink,
      `${STUDIO_HOST}/dashboard?designId=a-design-id&stepId=a-step-id&showTracking=view&trackingId=a-tracking-id`,
      "Deep link matches"
    );
    t.true(htmlLink.includes("Test design"), "HTML link contains title");
  });

  test("Team link", async (t: Test) => {
    const { deepLink, htmlLink } = getLinks({
      type: LinkType.Team,
      team: {
        id: "a-team-id",
        title: "Test team",
      },
    });

    t.equal(deepLink, `${STUDIO_HOST}/teams/a-team-id`, "Deep link matches");
    t.true(htmlLink.includes("Test team"), "HTML link contains title");
  });
});
