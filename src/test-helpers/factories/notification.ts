import * as uuid from 'node-uuid';
import { create } from '../../components/notifications/dao';
import {
  ImmediateInviteNotification,
  Notification,
  NotificationType,
  PartnerAcceptBidNotification
} from '../../components/notifications/domain-object';
import { findById as findUserById } from '../../dao/users';
import createUser = require('../create-user');
import * as CollaboratorsDAO from '../../components/collaborators/dao';
import Collaborator from '../../components/collaborators/domain-objects/collaborator';
import * as ProductDesignsDAO from '../../dao/product-designs';
import generateCollection from './collection';
import Collection from '../../domain-objects/collection';
import User = require('../../domain-objects/user');
import ProductDesign = require('../../domain-objects/product-design');

interface InviteNotificationWithResources {
  actor: User;
  collaborator: Collaborator;
  collection: Collection;
  notification: Notification;
}

interface PartnerAcceptBidNotificationWithResources {
  actor: User;
  design: ProductDesign;
  notification: Notification;
  recipient: any;
}

/**
 * Generates a Partner Accept Bid notification
 */
export async function generatePartnerAcceptBidNotification(
  options: Partial<PartnerAcceptBidNotification> = {}
): Promise<PartnerAcceptBidNotificationWithResources> {
  const { user: actor } = options.actorUserId
    ? { user: await findUserById(options.actorUserId) }
    : await createUser({ withSession: false });
  const { user: recipient } = options.recipientUserId
    ? { user: await findUserById(options.recipientUserId) }
    : await createUser({ withSession: false });
  const design = options.designId
    ? await ProductDesignsDAO.findById(options.designId)
    : await ProductDesignsDAO.create({
      productType: 'SWEATER',
      title: 'Mohair Wool Sweater',
      userId: recipient.id
    });

  if (!design) { throw new Error('Could not generate a design!'); }

  const payload: PartnerAcceptBidNotification = {
    actorUserId: actor.id,
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    recipientUserId: recipient.id,
    sentEmailAt: null,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID,
    ...options
  };
  const notification = await create(payload);

  return {
    actor,
    design,
    notification,
    recipient
  };
}

/**
 * Generates an invite notification.
 */
export async function generateInviteNotification(
  options: Partial<ImmediateInviteNotification> = {}
): Promise<InviteNotificationWithResources> {
  const { user: actor } = options.actorUserId
    ? { user: await findUserById(options.actorUserId) }
    : await createUser({ withSession: false });
  const { collection } = await generateCollection({ createdBy: actor.id });
  const collaborator = options.collaboratorId
    ? await CollaboratorsDAO.findById(options.collaboratorId)
    : await CollaboratorsDAO.create({
      collectionId: collection.id,
      designId: null,
      invitationMessage: '',
      role: 'EDIT',
      userEmail: null,
      userId: actor.id
    });
  if (!collaborator) { throw new Error('Could not generate a collaborator!');  }

  const payload: ImmediateInviteNotification = {
    actorUserId: actor.id,
    collaboratorId: collaborator.id,
    collectionId: null,
    createdAt: new Date(),
    designId: null,
    id: uuid.v4(),
    recipientUserId: null,
    sentEmailAt: new Date(),
    type: NotificationType.INVITE_COLLABORATOR,
    ...options
  };
  const notification = await create(payload);

  return {
    actor,
    collaborator,
    collection,
    notification
  };
}
