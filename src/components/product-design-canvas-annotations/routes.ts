import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as Knex from 'knex';
import { pick } from 'lodash';

import * as db from '../../services/db';
import Annotation from './domain-object';
import {
  create,
  deleteById,
  findAllByCanvasId,
  findAllWithCommentsByCanvasId,
  update
} from './dao';
import { hasOnlyProperties } from '../../services/require-properties';
import Comment, {
  BASE_COMMENT_PROPERTIES,
  isBaseComment
} from '../../components/comments/domain-object';
import * as CommentDAO from '../../components/comments/dao';
import * as AnnotationCommentDAO from '../../components/annotation-comments/dao';
import * as NotificationsService from '../../services/create-notifications';
import ResourceNotFoundError from '../../errors/resource-not-found';
import requireAuth = require('../../middleware/require-auth');
import filterError = require('../../services/filter-error');
import addAtMentionDetails from '../../services/add-at-mention-details';

const router = new Router();

interface GetListQuery {
  canvasId?: string;
  hasComments?: string;
}

function isAnnotation(candidate: object): candidate is Annotation {
  return hasOnlyProperties(
    candidate,
    'canvasId',
    'createdAt',
    'createdBy',
    'deletedAt',
    'id',
    'x',
    'y'
  );
}

const annotationFromIO = (
  request: Annotation,
  userId: string
): Annotation => {
  return {
    ...request,
    createdBy: userId
  };
};

function* createAnnotation(this: Koa.Application.Context): AsyncIterableIterator<Annotation> {
  const body = this.request.body;
  if (body && isAnnotation(body)) {
    const annotation = yield create(annotationFromIO(body, this.state.userId));
    this.status = 201;
    this.body = annotation;
  } else {
    this.throw(400, 'Request does not match ProductDesignCanvas');
  }
}

function* updateAnnotation(this: Koa.Application.Context): AsyncIterableIterator<Annotation> {
  const body = this.request.body;
  if (body && isAnnotation(body)) {
    const annotation = yield update(this.params.annotationId, body);
    this.status = 200;
    this.body = annotation;
  } else {
    this.throw(400, 'Request does not match ProductDesignCanvasAnnotation');
  }
}

function* deleteAnnotation(this: Koa.Application.Context): AsyncIterableIterator<Annotation> {
  yield deleteById(this.params.annotationId)
    .catch(filterError(ResourceNotFoundError, () => {
      this.throw(404, 'Annotation not found');
    }));

  this.status = 204;
}

function* getList(this: Koa.Application.Context): AsyncIterableIterator<Annotation> {
  const query: GetListQuery = this.query;
  if (!query.canvasId) {
    return this.throw(400, 'Missing canvasId');
  }

  const annotations = query.hasComments !== 'true'
    ? yield findAllByCanvasId(query.canvasId)
    : yield findAllWithCommentsByCanvasId(query.canvasId);

  this.status = 200;
  this.body = annotations;
}

function* createAnnotationComment(this: Koa.Application.Context): AsyncIterableIterator<Comment> {
  let comment: Comment | undefined;
  const userId = this.state.userId;
  const body = pick(this.request.body, BASE_COMMENT_PROPERTIES);

  if (body && isBaseComment(body) && this.params.annotationId) {
    yield db.transaction(async (trx: Knex.Transaction) => {
      comment = await CommentDAO.create({
        ...body,
        userId
      }, trx);
      await AnnotationCommentDAO.create({
        annotationId: this.params.annotationId,
        commentId: comment.id
      }, trx);
      await NotificationsService.sendDesignOwnerAnnotationCommentCreateNotification(
        body.id,
        this.params.annotationId,
        this.state.userId,
        comment.id
      );
    });
    this.status = 201;
    this.body = comment;
  } else {
    this.throw(400, `Request does not match model: ${Object.keys(body)}`);
  }
}

function* getAnnotationComments(this: Koa.Application.Context): AsyncIterableIterator<Comment[]> {
  const comments = yield AnnotationCommentDAO.findByAnnotationId(this.params.annotationId);
  if (comments) {
    const commentsWithMentions = yield addAtMentionDetails(comments);
    this.status = 200;
    this.body = commentsWithMentions;
  } else {
    this.throw(404);
  }
}

router.get('/', requireAuth, getList);
router.put('/:annotationId', requireAuth, createAnnotation);
router.patch('/:annotationId', requireAuth, updateAnnotation);
router.del('/:annotationId', requireAuth, deleteAnnotation);

router.put('/:annotationId/comments/:commentId', requireAuth, createAnnotationComment);
router.get('/:annotationId/comments', requireAuth, getAnnotationComments);

export default router.routes();
