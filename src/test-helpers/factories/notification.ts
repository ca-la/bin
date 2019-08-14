import * as uuid from 'node-uuid';

import { create } from '../../components/notifications/dao';
import {
  Notification,
  NotificationType
} from '../../components/notifications/domain-object';
import { findById as findUserById } from '../../components/users/dao';
import createUser = require('../create-user');
import { CollaboratorWithUser } from '../../components/collaborators/domain-objects/collaborator';
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as CollectionsDAO from '../../components/collections/dao';
import * as CollaboratorsDAO from '../../components/collaborators/dao';
import * as AnnotationsDAO from '../../components/product-design-canvas-annotations/dao';
import * as CanvasesDAO from '../../components/canvases/dao';
import * as CommentsDAO from '../../components/comments/dao';
import * as MeasurementsDAO from '../../dao/product-design-canvas-measurements';
import * as StagesDAO from '../../dao/product-design-stages';
import * as TasksDAO from '../../dao/task-events';
import generateCollection from './collection';
import Collection from '../../components/collections/domain-object';
import User from '../../components/users/domain-object';
import ProductDesign = require('../../domain-objects/product-design');
import { templateNotification } from '../../components/notifications/models/base';
// tslint:disable-next-line:max-line-length
import ProductDesignCanvasAnnotation from '../../components/product-design-canvas-annotations/domain-object';
import { DetailsTask } from '../../domain-objects/task-event';
import Canvas from '../../components/canvases/domain-object';
import ProductDesignStage from '../../domain-objects/product-design-stage';
import Comment from '../../components/comments/domain-object';
import createDesign from '../../services/create-design';
import generateAnnotation from './product-design-canvas-annotation';
import generateComment from './comment';
import generateCollaborator from './collaborator';
import generateMeasurement from './product-design-canvas-measurement';
import generateTask from './task';
import ProductDesignCanvasMeasurement from '../../domain-objects/product-design-canvas-measurement';
import generateCanvas from './product-design-canvas';
import generateProductDesignStage from './product-design-stage';

interface NotificationWithResources {
  actor: User;
  recipient: User;
  notification: Notification;
  design: ProductDesign;
  collection: Collection;
  collaborator: CollaboratorWithUser;
  annotation: ProductDesignCanvasAnnotation;
  measurement: ProductDesignCanvasMeasurement;
  task: DetailsTask;
  canvas: Canvas;
  stage: ProductDesignStage;
  comment: Comment;
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
    throw new Error('Could not create collection');
  }

  const design = options.designId
    ? await ProductDesignsDAO.findById(options.designId)
    : await createDesign({
        productType: 'test',
        title: 'design',
        userId: actor.id
      });
  if (!design) {
    throw new Error('Could not create design');
  }

  try {
    await CollectionsDAO.addDesign(collection.id, design.id);
  } catch (e) {
    // noop
  }

  const { collaborator } = options.collaboratorId
    ? { collaborator: await CollaboratorsDAO.findById(options.collaboratorId) }
    : await generateCollaborator({
        collectionId: collection.id,
        userId: recipient.id
      });
  if (!collaborator) {
    throw new Error('Could not create collaborator');
  }

  const { canvas } = options.canvasId
    ? { canvas: await CanvasesDAO.findById(options.canvasId) }
    : await generateCanvas({ createdBy: actor.id });
  if (!canvas) {
    throw new Error('Could not create canvas');
  }

  const { annotation } = options.annotationId
    ? { annotation: await AnnotationsDAO.findById(options.annotationId) }
    : await generateAnnotation({ createdBy: actor.id, canvasId: canvas.id });
  if (!annotation) {
    throw new Error('Could not create annotation');
  }

  const { measurement } = options.measurementId
    ? { measurement: await MeasurementsDAO.findById(options.measurementId) }
    : await generateMeasurement({ createdBy: actor.id, canvasId: canvas.id });
  if (!measurement) {
    throw new Error('Could not create measurement');
  }

  const { comment } = options.commentId
    ? { comment: await CommentsDAO.findById(options.commentId) }
    : await generateComment({
        userId: actor.id,
        text: `Hello @<${collaborator.id}|collaborator>`
      });
  if (!comment) {
    throw new Error('Could not create comment');
  }

  const { stage } = options.stageId
    ? { stage: await StagesDAO.findById(options.stageId) }
    : await generateProductDesignStage({ designId: design.id });
  if (!stage) {
    throw new Error('Could not create stage');
  }

  const { task } = options.taskId
    ? { task: await TasksDAO.findById(options.taskId) }
    : await generateTask({ createdBy: actor.id, designStageId: stage.id });
  if (!task) {
    throw new Error('Could not create task');
  }

  const base = {
    actor,
    annotation,
    canvas,
    collaborator,
    collection,
    comment,
    design,
    measurement,
    recipient,
    stage,
    task
  };

  const baseNotification = {
    ...templateNotification,
    actorUserId: actor.id,
    createdAt: options.createdAt || new Date(),
    deletedAt: options.deletedAt || null,
    id: options.id || id,
    readAt: options.readAt || null,
    recipientUserId: recipient.id,
    sentEmailAt: options.sentEmailAt || null
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
        type: options.type
      });

      return {
        ...base,
        notification
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
        type: options.type
      });

      return {
        ...base,
        notification
      };
    }
    case NotificationType.COLLECTION_SUBMIT: {
      const notification = await create({
        ...baseNotification,
        collectionId: collection.id,
        recipientUserId: base.recipient.id,
        type: options.type
      });

      return {
        ...base,
        notification
      };
    }
    case NotificationType.COMMIT_COST_INPUTS: {
      const notification = await create({
        ...baseNotification,
        collectionId: collection.id,
        recipientUserId: base.recipient.id,
        sentEmailAt: new Date(),
        type: options.type
      });

      return {
        ...base,
        notification
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
        type: options.type
      });

      return {
        ...base,
        notification
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
        type: options.type
      });

      return {
        ...base,
        notification
      };
    }
    case NotificationType.PARTNER_ACCEPT_SERVICE_BID: {
      const notification = await create({
        ...baseNotification,
        designId: design.id,
        recipientUserId: base.recipient.id,
        type: options.type
      });

      return {
        ...base,
        notification
      };
    }
    case NotificationType.PARTNER_DESIGN_BID: {
      const notification = await create({
        ...baseNotification,
        designId: design.id,
        recipientUserId: base.recipient.id,
        type: options.type
      });

      return {
        ...base,
        notification
      };
    }
    case NotificationType.PARTNER_REJECT_SERVICE_BID: {
      const notification = await create({
        ...baseNotification,
        designId: design.id,
        recipientUserId: base.recipient.id,
        type: options.type
      });

      return {
        ...base,
        notification
      };
    }
    case NotificationType.PARTNER_PAIRING_COMMITTED: {
      const notification = await create({
        ...baseNotification,
        collectionId: collection.id,
        recipientUserId: base.recipient.id,
        type: options.type
      });

      return {
        ...base,
        notification
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
        type: options.type
      });

      return {
        ...base,
        notification
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
        type: options.type
      });

      return {
        ...base,
        notification
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
        type: options.type
      });

      return {
        ...base,
        notification
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
        type: options.type
      });

      return {
        ...base,
        notification
      };
    }
  }
}
