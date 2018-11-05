import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as Knex from 'knex';

import * as db from '../../services/db';
import Annotation from '../../domain-objects/product-design-canvas-annotation';
import {
  create,
  deleteById,
  findAllByCanvasId,
  update
} from '../../dao/product-design-canvas-annotations';
import { hasOnlyProperties } from '../../services/require-properties';
import Comment, { isComment } from '../../domain-objects/comment';
import * as CommentDAO from '../../dao/comments';
import * as AnnotationCommentDAO from '../../dao/product-design-canvas-annotation-comments';

import requireAuth = require('../../middleware/require-auth');

const router = new Router();

interface GetListQuery {
  canvasId?: string;
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
  const annotation = yield deleteById(this.params.annotationId);
  if (!annotation) { this.throw(400, 'Failed to delete the annotation'); }
  this.status = 204;
}

function* getList(this: Koa.Application.Context): AsyncIterableIterator<Annotation> {
  const query: GetListQuery = this.query;
  if (!query.canvasId) {
    return this.throw(400, 'Missing canvasId');
  }

  const annotations = yield findAllByCanvasId(query.canvasId);
  this.status = 200;
  this.body = annotations;
}

function* createAnnotationComment(this: Koa.Application.Context): AsyncIterableIterator<Comment> {
  let comment;
  const userId = this.state.userId;
  const body = this.request.body;

  if (body && isComment(body) && this.params.annotationId) {
    yield db.transaction(async (trx: Knex.Transaction) => {
      comment = await CommentDAO.create({
        ...body,
        userId
      }, trx);
      await AnnotationCommentDAO.create({
        annotationId: this.params.annotationId,
        commentId: comment.id
      }, trx);
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
    this.status = 200;
    this.body = comments;
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

export = router.routes();
