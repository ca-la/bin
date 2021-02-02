import tape from "tape";

import { sandbox, test } from "../../../../test-helpers/fresh";
import createUser from "../../../../test-helpers/create-user";
import * as SendMessageService from "../../send-message";
import * as CreateNotificationService from "../../../notifications/notification-messages";
import { NotificationType } from "../../../notifications/domain-object";
import { announceNotificationCreation } from "./index";
import { FullTaskAssignmentNotification } from "../../../notifications/models/task-assignment";
import { FullInviteCollaboratorNotification } from "../../../notifications/models/invite-collaborator";
import { templateNotification } from "../../../notifications/models/base";

test("sendMessage supports sending a message", async (t: tape.Test) => {
  const sendStub = sandbox()
    .stub(SendMessageService, "sendMessage")
    .resolves({});
  const createStub = sandbox()
    .stub(CreateNotificationService, "createNotificationMessage")
    .resolves({
      foo: "bar",
    });
  const { user: actor } = await createUser({ withSession: false });

  const notification: FullTaskAssignmentNotification = {
    ...templateNotification,
    actorUserId: actor.id,
    actor,
    annotationImageId: null,
    approvalStepTitle: null,
    approvalSubmissionTitle: null,
    collaboratorId: "abddd",
    collectionId: "collection-adsfafd",
    collectionTitle: null,
    commentText: null,
    componentType: null,
    createdAt: new Date("2019-02-02"),
    designId: "abc-1222343",
    designImageIds: [],
    designTitle: null,
    hasAttachments: false,
    id: "abddfad-ddd",
    recipientUserId: "zzzz-2222",
    shipmentTrackingDescription: null,
    stageId: "112-333",
    taskId: "abc-123",
    taskTitle: "Some title",
    teamTitle: null,
    trackingEventTag: null,
    trackingEventSubtag: null,
    trackingId: null,
    type: NotificationType.TASK_ASSIGNMENT,
  };
  const response = await announceNotificationCreation(notification);

  t.deepEqual(response, {
    channels: ["notifications/zzzz-2222"],
    resource: { foo: "bar" },
    type: "notification/created",
  });
  t.equal(sendStub.callCount, 1);
  t.equal(createStub.callCount, 1);
});

test("sendMessage can early return if the notification is missing data", async (t: tape.Test) => {
  const sendStub = sandbox()
    .stub(SendMessageService, "sendMessage")
    .resolves({});
  const createStub = sandbox()
    .stub(CreateNotificationService, "createNotificationMessage")
    .resolves(null);
  const { user: actor } = await createUser({ withSession: false });

  const notification: FullTaskAssignmentNotification = {
    ...templateNotification,
    actorUserId: actor.id,
    actor,
    annotationImageId: null,
    approvalStepTitle: null,
    approvalSubmissionTitle: null,
    collaboratorId: "abddd",
    collectionId: "collection-adsfafd",
    collectionTitle: null,
    commentText: null,
    componentType: null,
    createdAt: new Date("2019-02-02"),
    designId: "abc-1222343",
    designImageIds: [],
    designTitle: null,
    hasAttachments: false,
    id: "abddfad-ddd",
    recipientUserId: "zzzz-2222",
    shipmentTrackingDescription: null,
    trackingEventTag: null,
    trackingEventSubtag: null,
    stageId: "112-333",
    taskId: "abc-123",
    taskTitle: "Some title",
    teamTitle: null,
    trackingId: null,
    type: NotificationType.TASK_ASSIGNMENT,
  };
  const response = await announceNotificationCreation(notification);

  t.equal(response, null);
  t.equal(sendStub.callCount, 0);
  t.equal(createStub.callCount, 1);
});

test("sendMessage can early return if the notification is missing data", async (t: tape.Test) => {
  const sendStub = sandbox()
    .stub(SendMessageService, "sendMessage")
    .resolves({});
  const createStub = sandbox()
    .stub(CreateNotificationService, "createNotificationMessage")
    .resolves({ foo: "bar" });
  const { user: actor } = await createUser({ withSession: false });

  const notification: FullInviteCollaboratorNotification = {
    ...templateNotification,
    actorUserId: actor.id,
    actor,
    annotationImageId: null,
    approvalStepTitle: null,
    approvalSubmissionTitle: null,
    collaboratorId: "abddd",
    collectionId: "collection-adsfafd",
    collectionTitle: "A collection",
    commentText: null,
    componentType: null,
    createdAt: new Date("2019-02-02"),
    designId: "abc-1222343",
    designImageIds: [],
    designTitle: "A design",
    hasAttachments: false,
    id: "abddfad-ddd",
    sentEmailAt: new Date("2019-02-02"),
    shipmentTrackingDescription: null,
    taskTitle: null,
    teamTitle: null,
    trackingEventTag: null,
    trackingEventSubtag: null,
    trackingId: null,
    type: NotificationType.INVITE_COLLABORATOR,
  };
  const response = await announceNotificationCreation(notification);

  t.equal(response, null);
  t.equal(sendStub.callCount, 0);
  t.equal(createStub.callCount, 1);
});
