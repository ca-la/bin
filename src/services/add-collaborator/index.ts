import { escape as escapeHtml } from 'lodash';

import CollaboratorsDAO = require('../../components/collaborators/dao');
import InvalidDataError = require('../../errors/invalid-data');
import normalizeEmail = require('../normalize-email');
import UsersDAO = require('../../components/users/dao');
import Validation = require('../../services/validation');
import * as NotificationsService from '../../services/create-notifications';
import User from '../../components/users/domain-object';
import {
  CollaboratorWithUser,
  Roles
} from '../../components/collaborators/domain-objects/collaborator';

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
  role: Roles;
  unsafeInvitationMessage?: string;
  inviterUserId: string;
  designId: string | null | undefined;
  collectionId: string | null | undefined;
}

export default async function addCollaborator(
  options: BaseOptions
): Promise<CollaboratorWithUser> {
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

  const escapedMessage = escapeHtml(unsafeInvitationMessage);
  const invitationMessage = escapedMessage || 'Check out CALA!';

  const collaborator = user ? await CollaboratorsDAO.create({
    cancelledAt: null,
    collectionId: options.collectionId || null,
    designId: options.designId || null,
    invitationMessage: '',
    role,
    userEmail: null,
    userId: user.id
  }) : await CollaboratorsDAO.create({
    cancelledAt: null,
    collectionId: options.collectionId || null,
    designId: options.designId || null,
    invitationMessage,
    role,
    userEmail: normalizedEmail,
    userId: null
  });

  NotificationsService.immediatelySendInviteCollaborator({
    actorId: inviter.id,
    collectionId: options.collectionId || null,
    designId: options.designId || null,
    targetCollaboratorId: collaborator.id,
    targetUserId: collaborator.userId || null
  });

  return collaborator;
}
