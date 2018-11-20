import { escape } from 'lodash';

import CollaboratorsDAO = require('../../dao/collaborators');
import InvalidDataError = require('../../errors/invalid-data');
import normalizeEmail = require('../normalize-email');
import UsersDAO = require('../../dao/users');
import Validation = require('../../services/validation');
import * as NotificationsService from '../../services/create-notifications';
import User from '../../domain-objects/user';

type Role = 'EDIT' | 'COMMENT' | 'VIEW';

/**
 * Add a collaborator to a design. If a user exists with this email, adds them
 * straight away. If not, creates a pending collaborator (i.e. with just the
 * email on file) and dispatches an email.
 *
 * Whenever someone signs up, we check for outstanding invitations and add them
 * to all relevant designs.
 */
interface BaseOptions {
  email: string;
  role: Role;
  unsafeInvitationMessage: string;
  inviterUserId: string;
}

interface DesignOptions extends BaseOptions {
  designId: string;
  collectionId: null;
}

interface CollectionOptions extends BaseOptions {
  collectionId: string;
  designId: null;
}

async function addCollaborator(options: DesignOptions | CollectionOptions): Promise<void> {
  const {
    email,
    inviterUserId,
    role,
    unsafeInvitationMessage
  } = options;

  if (!Validation.isValidEmail(email)) { throw new InvalidDataError('Invalid email address'); }

  const normalizedEmail = normalizeEmail(email);
  const user = await UsersDAO.findByEmail(normalizedEmail) as (User | null);
  const inviter = await UsersDAO.findById(inviterUserId) as (User | null);

  if (!inviter) { throw new Error('Inviter is not specified!'); }

  const escapedMessage = escape(unsafeInvitationMessage);
  const invitationMessage = escapedMessage || 'Check out CALA!';

  const collaborator = user ? await CollaboratorsDAO.create({
    collectionId: options.collectionId,
    designId: options.designId,
    role,
    userId: user.id
  }) : await CollaboratorsDAO.create({
    collectionId: options.collectionId,
    designId: options.designId,
    invitationMessage,
    role,
    userEmail: normalizedEmail
  });

  NotificationsService.immediatelySendInviteCollaborator({
    actorId: inviter.id,
    collectionId: options.collectionId,
    designId: options.designId,
    targetCollaboratorId: collaborator.id,
    targetUserId: collaborator.userId
  });

  return collaborator;
}

module.exports = addCollaborator;
