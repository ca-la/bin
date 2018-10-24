import { escape } from 'lodash';

import CollaboratorsDAO = require('../../dao/collaborators');
import CollectionsDAO = require('../../dao/collections');
import EmailService = require('../email');
import InvalidDataError = require('../../errors/invalid-data');
import ProductDesignsDAO = require('../../dao/product-designs');
import UsersDAO = require('../../dao/users');
import Validation = require('../../services/validation');
import config = require('../../config');
import normalizeEmail = require('../normalize-email');
const { STUDIO_HOST } = config;

type Role = 'EDIT' | 'COMMENT' | 'VIEW';

function getRoleDescription(role: Role): string {
  switch (role) {
    case 'EDIT': return 'edit';
    case 'COMMENT': return 'comment on';
    case 'VIEW': return 'view';
  }
}

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

  if (!Validation.isValidEmail(email)) {
    throw new InvalidDataError('Invalid email address');
  }

  const normalizedEmail = normalizeEmail(email);

  const user = await UsersDAO.findByEmail(normalizedEmail);
  const inviter = await UsersDAO.findById(inviterUserId);

  let title: string;
  let imageUrl: string = '';
  let resourceUrl: string;

  if (options.designId) {
    const design = await ProductDesignsDAO.findById(options.designId);
    if (!design) { throw new Error(`Unknown design ${options.designId}`); }

    title = design.title || 'Untitled Garment';
    resourceUrl = `${STUDIO_HOST}/designs/${design.id}`;

    const firstPreviewImage = (design.previewImageUrls && design.previewImageUrls[0]);
    if (firstPreviewImage) {
      imageUrl = firstPreviewImage;
    }
  } else { // `options` is `CollectionOptions`
    const collection = await CollectionsDAO.findById(options.collectionId);
    if (!collection) { throw new Error(`Unknown collection ${options.collectionId}`); }

    title = collection.title || 'Untitled Collection';
    resourceUrl = `${STUDIO_HOST}/collections/${collection.id}`;
  }

  const escapedMessage = escape(unsafeInvitationMessage);
  const invitationMessage = escapedMessage || 'Check out CALA!';

  let collaborator;

  if (user) {
    collaborator = await CollaboratorsDAO.create({
      collectionId: options.collectionId,
      designId: options.designId,
      role,
      userId: user.id
    });
  } else {
    collaborator = await CollaboratorsDAO.create({
      collectionId: options.collectionId,
      designId: options.designId,
      invitationMessage,
      role,
      userEmail: normalizedEmail
    });
  }

  const senderName = inviter.name;

  await EmailService.enqueueSend({
    params: {
      invitationMessage,
      previewImageUrl: imageUrl,
      resourceTitle: title,
      resourceUrl,
      roleDescription: getRoleDescription(role),
      senderName
    },
    templateName: 'add_collaborator',
    to: user ? user.email : normalizedEmail
  });

  return collaborator;
}

module.exports = addCollaborator;
