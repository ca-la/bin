import uuid from "node-uuid";
import Knex from "knex";

import { create } from "../../components/notifications/dao";
import {
  FullNotification,
  Notification,
  NotificationType,
} from "../../components/notifications/domain-object";
import { findById as findUserById } from "../../components/users/dao";
import createUser from "../create-user";
import { CollaboratorWithUser } from "../../components/collaborators/domain-objects/collaborator";
import ProductDesignsDAO from "../../components/product-designs/dao";
import * as CollectionsDAO from "../../components/collections/dao";
import * as CollaboratorsDAO from "../../components/collaborators/dao";
import * as CollaboratorTasksDAO from "../../dao/collaborator-tasks";
import * as AnnotationsDAO from "../../components/product-design-canvas-annotations/dao";
import * as CanvasesDAO from "../../components/canvases/dao";
import * as CommentsDAO from "../../components/comments/dao";
import * as MeasurementsDAO from "../../dao/product-design-canvas-measurements";
import * as ProductDesignStagesDAO from "../../dao/product-design-stages";
import * as TasksDAO from "../../dao/task-events";
import * as ApprovalStepDAO from "../../components/approval-steps/dao";
import * as ApprovalSubmissionsDAO from "../../components/approval-step-submissions/dao";

import generateCollection from "./collection";
import Collection from "../../components/collections/domain-object";
import User from "../../components/users/domain-object";
import ProductDesign = require("../../components/product-designs/domain-objects/product-design");
import { templateNotification } from "../../components/notifications/models/base";
// tslint:disable-next-line:max-line-length
import ProductDesignCanvasAnnotation from "../../components/product-design-canvas-annotations/domain-object";
import { DetailsTask } from "../../domain-objects/task-event";
import Canvas from "../../components/canvases/domain-object";
import ProductDesignStage from "../../domain-objects/product-design-stage";
import Comment from "../../components/comments/domain-object";
import createDesign from "../../services/create-design";
import generateAnnotation from "./product-design-canvas-annotation";
import generateComment from "./comment";
import generateCollaborator from "./collaborator";
import generateMeasurement from "./product-design-canvas-measurement";
import generateTask from "./task";
import ProductDesignCanvasMeasurement from "../../domain-objects/product-design-canvas-measurement";
import generateCanvas from "./product-design-canvas";
import generateProductDesignStage from "./product-design-stage";
import { addDesign } from "../collections";
import generateApprovalStep from "./design-approval-step";
import generateApprovalSubmission from "./design-approval-submission";
import db from "../../services/db";
import ApprovalStep from "../../components/approval-steps/domain-object";

interface NotificationWithResources {
  actor: User;
  recipient: User;
  notification: FullNotification;
  design: ProductDesign;
  collection: Collection;
  collaborator: CollaboratorWithUser;
  annotation: ProductDesignCanvasAnnotation;
  measurement: ProductDesignCanvasMeasurement;
  task: DetailsTask;
  canvas: Canvas;
  stage: ProductDesignStage;
  comment: Comment;
  approvalStep: ApprovalStep;
}

export default async function generateNotification(
  options: Partial<Notification> & { type: NotificationType }
): Promise<NotificationWithResources> {
  const { user: actor } = options.actorUserId
    ? { user: await findUserById(options.actorUserId) }
    : await createUser({ withSession: false });

  const { user: recipient } = options.recipientUserId
    ? { user: await findUserById(options.recipientUserId) }
    : await createUser({ withSession: false });

  const id = options.id || uuid.v4();

  const { collection } = options.collectionId
    ? { collection: await CollectionsDAO.findById(options.collectionId) }
    : await generateCollection({ createdBy: actor.id });
  if (!collection) {
    throw new Error("Could not create collection");
  }

  const design = options.designId
    ? await ProductDesignsDAO.findById(options.designId)
    : await createDesign({
        productType: "test",
        title: "design",
        userId: actor.id,
      });
  if (!design) {
    throw new Error("Could not create design");
  }

  try {
    await addDesign(collection.id, design.id);
  } catch (e) {
    // no-op
  }

  const { collaborator } = options.collaboratorId
    ? { collaborator: await CollaboratorsDAO.findById(options.collaboratorId) }
    : await generateCollaborator({
        collectionId: collection.id,
        userId: recipient.id,
      });
  if (!collaborator) {
    throw new Error("Could not create collaborator");
  }

  const { canvas } = options.canvasId
    ? { canvas: await CanvasesDAO.findById(options.canvasId) }
    : await generateCanvas({ createdBy: actor.id });
  if (!canvas) {
    throw new Error("Could not create canvas");
  }

  const { annotation } = options.annotationId
    ? { annotation: await AnnotationsDAO.findById(options.annotationId) }
    : await generateAnnotation({ createdBy: actor.id, canvasId: canvas.id });
  if (!annotation) {
    throw new Error("Could not create annotation");
  }

  const { measurement } = options.measurementId
    ? { measurement: await MeasurementsDAO.findById(options.measurementId) }
    : await generateMeasurement({ createdBy: actor.id, canvasId: canvas.id });
  if (!measurement) {
    throw new Error("Could not create measurement");
  }

  const { comment } = options.commentId
    ? { comment: await CommentsDAO.findById(options.commentId) }
    : await generateComment({
        userId: actor.id,
        text: `Hello @<${collaborator.id}|collaborator>`,
      });
  if (!comment) {
    throw new Error("Could not create comment");
  }

  const { stage } = options.stageId
    ? { stage: await ProductDesignStagesDAO.findById(options.stageId) }
    : await generateProductDesignStage({ designId: design.id });
  if (!stage) {
    throw new Error("Could not create stage");
  }

  const { task } = options.taskId
    ? {
        task: await db.transaction((trx: Knex.Transaction) =>
          TasksDAO.findById(trx, options.taskId!)
        ),
      }
    : await generateTask({ createdBy: actor.id, designStageId: stage.id });
  if (!task) {
    throw new Error("Could not create task");
  }

  const { approvalStep } = await db.transaction(async (trx: Knex.Transaction) =>
    options.approvalStepId
      ? {
          approvalStep: await ApprovalStepDAO.findById(
            trx,
            options.approvalStepId
          ),
        }
      : await generateApprovalStep(trx, { designId: design.id })
  );

  const { submission } = await db.transaction(async (trx: Knex.Transaction) =>
    options.approvalSubmissionId
      ? {
          submission: await ApprovalSubmissionsDAO.findById(
            trx,
            options.approvalSubmissionId
          ),
        }
      : await generateApprovalSubmission(trx, { stepId: approvalStep.id })
  );

  const base = {
    actor,
    annotation,
    approvalStep,
    canvas,
    collaborator,
    collection,
    comment,
    design,
    measurement,
    recipient,
    stage,
    task,
  };

  const baseNotification = {
    ...templateNotification,
    actorUserId: actor.id,
    createdAt: options.createdAt || new Date(),
    deletedAt: options.deletedAt || null,
    id: options.id || id,
    readAt: options.readAt || null,
    recipientUserId: recipient.id,
    sentEmailAt: options.sentEmailAt || null,
  } as any;

  switch (options.type) {
    case NotificationType.ANNOTATION_COMMENT_CREATE: {
      const notification = await create({
        ...baseNotification,
        annotationId: annotation.id,
        canvasId: canvas.id,
        collectionId: collection.id,
        commentId: comment.id,
        designId: design.id,
        recipientUserId: base.recipient.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.ANNOTATION_COMMENT_MENTION: {
      const notification = await create({
        ...baseNotification,
        annotationId: annotation.id,
        canvasId: canvas.id,
        collectionId: collection.id,
        commentId: comment.id,
        designId: design.id,
        recipientUserId: base.recipient.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.ANNOTATION_COMMENT_REPLY: {
      const notification = await create({
        ...baseNotification,
        annotationId: annotation.id,
        canvasId: canvas.id,
        collectionId: collection.id,
        commentId: comment.id,
        designId: design.id,
        recipientUserId: base.recipient.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.COLLECTION_SUBMIT: {
      const notification = await create({
        ...baseNotification,
        collectionId: collection.id,
        recipientUserId: base.recipient.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.COMMIT_COST_INPUTS: {
      const notification = await create({
        ...baseNotification,
        collectionId: collection.id,
        recipientUserId: base.recipient.id,
        sentEmailAt: new Date(),
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.INVITE_COLLABORATOR: {
      const notification = await create({
        ...baseNotification,
        collaboratorId: collaborator.id,
        collectionId: collection.id,
        designId: design.id,
        recipientUserId: null,
        sentEmailAt: new Date(),
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.MEASUREMENT_CREATE: {
      const notification = await create({
        ...baseNotification,
        canvasId: canvas.id,
        collectionId: collection.id,
        designId: design.id,
        measurementId: measurement.id,
        recipientUserId: base.recipient.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.PARTNER_ACCEPT_SERVICE_BID: {
      const notification = await create({
        ...baseNotification,
        designId: design.id,
        recipientUserId: base.recipient.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.PARTNER_DESIGN_BID: {
      const notification = await create({
        ...baseNotification,
        designId: design.id,
        recipientUserId: base.recipient.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.PARTNER_REJECT_SERVICE_BID: {
      const notification = await create({
        ...baseNotification,
        designId: design.id,
        recipientUserId: base.recipient.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.PARTNER_PAIRING_COMMITTED: {
      const notification = await create({
        ...baseNotification,
        collectionId: collection.id,
        recipientUserId: base.recipient.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.TASK_ASSIGNMENT: {
      const notification = await create({
        ...baseNotification,
        collaboratorId: collaborator.id,
        collectionId: collection.id,
        designId: design.id,
        recipientUserId: base.recipient.id,
        stageId: stage.id,
        taskId: task.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.TASK_COMMENT_CREATE: {
      const notification = await create({
        ...baseNotification,
        collectionId: collection.id,
        commentId: comment.id,
        designId: design.id,
        recipientUserId: base.recipient.id,
        stageId: stage.id,
        taskId: task.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.TASK_COMMENT_MENTION: {
      const notification = await create({
        ...baseNotification,
        collectionId: collection.id,
        commentId: comment.id,
        designId: design.id,
        recipientUserId: base.recipient.id,
        stageId: stage.id,
        taskId: task.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.TASK_COMMENT_REPLY: {
      const notification = await create({
        ...baseNotification,
        collectionId: collection.id,
        commentId: comment.id,
        designId: design.id,
        recipientUserId: base.recipient.id,
        stageId: stage.id,
        taskId: task.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.TASK_COMPLETION: {
      const notification = await create({
        ...baseNotification,
        collaboratorId: collaborator.id,
        collectionId: collection.id,
        designId: design.id,
        recipientUserId: base.recipient.id,
        stageId: stage.id,
        taskId: task.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.COSTING_EXPIRATION_TWO_DAYS:
    case NotificationType.COSTING_EXPIRATION_ONE_WEEK:
    case NotificationType.COSTING_EXPIRED: {
      const notification = await create({
        ...baseNotification,
        collectionId: collection.id,
        recipientUserId: base.recipient.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.APPROVAL_STEP_COMMENT_CREATE:
    case NotificationType.APPROVAL_STEP_COMMENT_REPLY:
    case NotificationType.APPROVAL_STEP_COMMENT_MENTION: {
      const notification = await create({
        ...baseNotification,
        collectionId: collection.id,
        commentId: comment.id,
        designId: design.id,
        approvalStepId: approvalStep.id,
        recipientUserId: base.recipient.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT: {
      const notification = await create({
        ...baseNotification,
        collectionId: collection.id,
        designId: design.id,
        approvalStepId: approvalStep.id,
        approvalSubmissionId: submission.id,
        recipientUserId: base.recipient.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
    case NotificationType.APPROVAL_STEP_ASSIGNMENT: {
      const notification = await create({
        ...baseNotification,
        collectionId: collection.id,
        designId: design.id,
        approvalStepId: approvalStep.id,
        recipientUserId: base.recipient.id,
        type: options.type,
      });

      return {
        ...base,
        notification,
      };
    }
  }
}

interface NotificationsWithResources {
  users: {
    admin: User;
    designer: User;
    partner: User;
    other: User;
  };
  notifications: Notification[];
  designs: ProductDesign[];
  collections: Collection[];
  collaborators: CollaboratorWithUser[];
  annotations: ProductDesignCanvasAnnotation[];
  measurements: ProductDesignCanvasMeasurement[];
  tasks: DetailsTask[];
  canvases: Canvas[];
  stages: ProductDesignStage[];
  comments: Comment[];
}

export async function generateNotifications(): Promise<
  NotificationsWithResources
> {
  const { user: admin } = await createUser({
    role: "ADMIN",
    withSession: false,
  });
  const { user: designer } = await createUser({
    role: "USER",
    withSession: false,
  });
  const { user: partner } = await createUser({
    role: "PARTNER",
    withSession: false,
  });
  const { user: other } = await createUser({
    role: "USER",
    withSession: false,
  });

  const designs = [
    await createDesign({
      productType: "T-SHIRT",
      title: "Design Zero",
      userId: designer.id,
    }),
    await createDesign({
      productType: "T-SHIRT",
      title: "Design One",
      userId: designer.id,
    }),
    await createDesign({
      productType: "T-SHIRT",
      title: "Design Two",
      userId: designer.id,
    }),
    await createDesign({
      productType: "T-SHIRT",
      title: "Design Three",
      userId: designer.id,
    }),
    await createDesign({
      productType: "T-SHIRT",
      title: "Design Four",
      userId: other.id,
    }),
    await createDesign({
      productType: "T-SHIRT",
      title: "Design Five",
      userId: other.id,
    }),
  ];

  const collections = [
    (
      await generateCollection({
        title: "Collection Zero",
        createdBy: designer.id,
      })
    ).collection,
    (
      await generateCollection({
        title: "Collection One",
        createdBy: designer.id,
      })
    ).collection,
    (await generateCollection({ title: "Collection Two", createdBy: other.id }))
      .collection,
  ];

  // Leave one design from each designer in drafts
  await addDesign(collections[0].id, designs[0].id);
  await addDesign(collections[0].id, designs[1].id);
  await addDesign(collections[1].id, designs[2].id);
  await addDesign(collections[2].id, designs[4].id);

  const collaborators = [
    await CollaboratorsDAO.findByDesignAndUser(designs[0].id, designer.id),
    await CollaboratorsDAO.findByDesignAndUser(designs[1].id, designer.id),
    await CollaboratorsDAO.findByDesignAndUser(designs[2].id, designer.id),
    await CollaboratorsDAO.findByDesignAndUser(designs[3].id, designer.id),
    await CollaboratorsDAO.findByDesignAndUser(designs[4].id, other.id),
    await CollaboratorsDAO.findByDesignAndUser(designs[5].id, other.id),
    (
      await generateCollaborator({
        userId: partner.id,
        designId: designs[0].id,
        role: "PARTNER",
      })
    ).collaborator,
    (
      await generateCollaborator({
        userId: partner.id,
        designId: designs[1].id,
        role: "PARTNER",
      })
    ).collaborator,
    (
      await generateCollaborator({
        userId: partner.id,
        designId: designs[2].id,
        role: "PARTNER",
      })
    ).collaborator,
  ].filter(Boolean) as CollaboratorWithUser[];

  const canvases = [
    (
      await generateCanvas({
        createdBy: designer.id,
        designId: designs[0].id,
      })
    ).canvas,
    (
      await generateCanvas({
        createdBy: designer.id,
        designId: designs[1].id,
      })
    ).canvas,
    (
      await generateCanvas({
        createdBy: partner.id,
        designId: designs[2].id,
      })
    ).canvas,
  ];

  const annotations = [
    (
      await generateAnnotation({
        createdBy: designer.id,
        canvasId: canvases[0].id,
      })
    ).annotation,
    (
      await generateAnnotation({
        createdBy: designer.id,
        canvasId: canvases[0].id,
      })
    ).annotation,
    (
      await generateAnnotation({
        createdBy: partner.id,
        canvasId: canvases[0].id,
      })
    ).annotation,
    (
      await generateAnnotation({
        createdBy: designer.id,
        canvasId: canvases[1].id,
      })
    ).annotation,
    (
      await generateAnnotation({
        createdBy: partner.id,
        canvasId: canvases[1].id,
      })
    ).annotation,
    (
      await generateAnnotation({
        createdBy: partner.id,
        canvasId: canvases[2].id,
      })
    ).annotation,
  ];

  const comments = [
    (
      await generateComment({
        userId: designer.id,
        text:
          "At-mention to the partner @<${collaborators[6].id}|collaborator>",
      })
    ).comment,
    (await generateComment({ userId: designer.id, text: "No at-mention" }))
      .comment,
    (
      await generateComment({
        userId: partner.id,
        text:
          "At-mention to the designer @<${collaborators[0].id}|collaborator>",
      })
    ).comment,
    (
      await generateComment({
        userId: designer.id,
        text:
          "At-mention to the partner @<${collaborators[6].id}|collaborator>",
      })
    ).comment,
    (await generateComment({ userId: partner.id, text: "No at-mention" }))
      .comment,
    (
      await generateComment({
        userId: partner.id,
        text:
          "At-mention to the designer @<${collaborators[0].id}|collaborator>",
      })
    ).comment,
  ];

  const measurements = [
    (
      await generateMeasurement({
        createdBy: designer.id,
        canvasId: canvases[0].id,
        label: "A",
      })
    ).measurement,
    (
      await generateMeasurement({
        createdBy: designer.id,
        canvasId: canvases[0].id,
        label: "B",
      })
    ).measurement,
  ];

  const stages = [
    ...(await ProductDesignStagesDAO.findAllByDesignId(designs[0].id)),
    ...(await ProductDesignStagesDAO.findAllByDesignId(designs[1].id)),
    ...(await ProductDesignStagesDAO.findAllByDesignId(designs[2].id)),
    ...(await ProductDesignStagesDAO.findAllByDesignId(designs[3].id)),
    ...(await ProductDesignStagesDAO.findAllByDesignId(designs[4].id)),
    ...(await ProductDesignStagesDAO.findAllByDesignId(designs[5].id)),
  ];

  const tasks = [
    (
      await generateTask({
        createdBy: designer.id,
        designStageId: stages[0].id,
      })
    ).task,
    ...(await TasksDAO.findByStageId(stages[0].id)),
    ...(await TasksDAO.findByStageId(stages[1].id)),
    ...(await TasksDAO.findByStageId(stages[2].id)),
    ...(await TasksDAO.findByStageId(stages[3].id)),
    ...(await TasksDAO.findByStageId(stages[4].id)),
    ...(await TasksDAO.findByStageId(stages[5].id)),
  ];

  await CollaboratorTasksDAO.create({
    taskId: tasks[0].id,
    collaboratorId: collaborators[6].id,
  });

  const notifications = [
    (
      await generateNotification({
        type: NotificationType.ANNOTATION_COMMENT_CREATE,
        annotationId: annotations[0].id,
        canvasId: canvases[0].id,
        commentId: comments[0].id,
        designId: designs[0].id,
        collectionId: collections[0].id,
        recipientUserId: partner.id,
      })
    ).notification,
    (
      await generateNotification({
        type: NotificationType.ANNOTATION_COMMENT_MENTION,
        annotationId: annotations[0].id,
        canvasId: canvases[0].id,
        commentId: comments[0].id,
        designId: designs[0].id,
        collectionId: collections[0].id,
        recipientUserId: partner.id,
      })
    ).notification,
    (
      await generateNotification({
        type: NotificationType.ANNOTATION_COMMENT_CREATE,
        annotationId: annotations[1].id,
        canvasId: canvases[0].id,
        commentId: comments[1].id,
        designId: designs[0].id,
        collectionId: collections[0].id,
        recipientUserId: partner.id,
      })
    ).notification,
    (
      await generateNotification({
        type: NotificationType.ANNOTATION_COMMENT_CREATE,
        annotationId: annotations[2].id,
        canvasId: canvases[0].id,
        commentId: comments[2].id,
        designId: designs[0].id,
        collectionId: collections[0].id,
        recipientUserId: designer.id,
      })
    ).notification,
    (
      await generateNotification({
        type: NotificationType.ANNOTATION_COMMENT_MENTION,
        annotationId: annotations[2].id,
        canvasId: canvases[0].id,
        commentId: comments[2].id,
        designId: designs[0].id,
        collectionId: collections[0].id,
        recipientUserId: designer.id,
      })
    ).notification,
    (
      await generateNotification({
        type: NotificationType.ANNOTATION_COMMENT_CREATE,
        annotationId: annotations[3].id,
        canvasId: canvases[1].id,
        commentId: comments[3].id,
        designId: designs[1].id,
        collectionId: collections[0].id,
        recipientUserId: partner.id,
      })
    ).notification,
    (
      await generateNotification({
        type: NotificationType.ANNOTATION_COMMENT_MENTION,
        annotationId: annotations[3].id,
        canvasId: canvases[1].id,
        commentId: comments[3].id,
        designId: designs[1].id,
        collectionId: collections[0].id,
        recipientUserId: partner.id,
      })
    ).notification,
    (
      await generateNotification({
        type: NotificationType.ANNOTATION_COMMENT_CREATE,
        annotationId: annotations[4].id,
        canvasId: canvases[1].id,
        commentId: comments[4].id,
        designId: designs[1].id,
        collectionId: collections[0].id,
        recipientUserId: designer.id,
      })
    ).notification,
    (
      await generateNotification({
        type: NotificationType.ANNOTATION_COMMENT_CREATE,
        annotationId: annotations[5].id,
        canvasId: canvases[2].id,
        commentId: comments[5].id,
        designId: designs[2].id,
        collectionId: collections[1].id,
        recipientUserId: designer.id,
      })
    ).notification,
    (
      await generateNotification({
        type: NotificationType.ANNOTATION_COMMENT_MENTION,
        annotationId: annotations[5].id,
        canvasId: canvases[2].id,
        commentId: comments[5].id,
        designId: designs[2].id,
        collectionId: collections[1].id,
        recipientUserId: designer.id,
      })
    ).notification,
    (
      await generateNotification({
        type: NotificationType.MEASUREMENT_CREATE,
        canvasId: canvases[0].id,
        collectionId: collections[0].id,
        designId: designs[0].id,
        measurementId: measurements[0].id,
        recipientUserId: partner.id,
      })
    ).notification,
    (
      await generateNotification({
        type: NotificationType.MEASUREMENT_CREATE,
        canvasId: canvases[0].id,
        collectionId: collections[0].id,
        designId: designs[0].id,
        measurementId: measurements[1].id,
        recipientUserId: partner.id,
      })
    ).notification,
    (
      await generateNotification({
        type: NotificationType.TASK_ASSIGNMENT,
        collectionId: collections[0].id,
        designId: designs[0].id,
        recipientUserId: partner.id,
        taskId: tasks[0].id,
      })
    ).notification,
    (
      await generateNotification({
        type: NotificationType.TASK_COMPLETION,
        collectionId: collections[0].id,
        designId: designs[0].id,
        recipientUserId: designer.id,
        taskId: tasks[0].id,
      })
    ).notification,
  ];

  return {
    annotations,
    canvases,
    collaborators,
    collections,
    comments,
    designs,
    measurements,
    notifications,
    stages,
    tasks,
    users: {
      admin,
      designer,
      partner,
      other,
    },
  };
}
