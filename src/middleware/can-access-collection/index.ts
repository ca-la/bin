import * as Koa from 'koa';

import CollectionsDAO = require('../../dao/collections');
import CollaboratorsDAO = require('../../dao/collaborators');

export default function* canAccessCollectionId(
  this: Koa.Application.Context,
  collectionId: string
): IterableIterator<any> {
  if (!collectionId) {
    throw new Error('Must pass collectionId to canAccessCollectionId');
  }

  const collection = yield CollectionsDAO.findById(collectionId);
  this.assert(collection, 404, 'Collection not found');

  this.state.collection = collection;

  if (this.state.userId === collection.createdBy) {
    return;
  }

  const collaborators = yield CollaboratorsDAO.findByCollectionAndUser(
    collectionId,
    this.state.userId
  );

  this.assert(collaborators.length > 0, 403);
}

module.exports = {
  canAccessCollectionId
};
