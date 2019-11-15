import Router from 'koa-router';

import Annotation from './domain-object';
import {
  create,
  deleteById,
  findAllByCanvasId,
  findAllWithCommentsByCanvasId,
  update
} from './dao';
import { hasOnlyProperties } from '../../services/require-properties';
import * as AnnotationCommentDAO from '../../components/annotation-comments/dao';
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

const annotationFromIO = (request: Annotation, userId: string): Annotation => {
  return {
    ...request,
    createdBy: userId
  };
};

function* createAnnotation(this: AuthedContext): Iterator<any, any, any> {
  const body = this.request.body;
  if (body && isAnnotation(body)) {
    const annotation = yield create(annotationFromIO(body, this.state.userId));
    this.status = 201;
    this.body = annotation;
  } else {
    this.throw(400, 'Request does not match Canvas');
  }
}

function* updateAnnotation(this: AuthedContext): Iterator<any, any, any> {
  const body = this.request.body;
  if (body && isAnnotation(body)) {
    const annotation = yield update(this.params.annotationId, body);
    this.status = 200;
    this.body = annotation;
  } else {
    this.throw(400, 'Request does not match ProductDesignCanvasAnnotation');
  }
}

function* deleteAnnotation(this: AuthedContext): Iterator<any, any, any> {
  yield deleteById(this.params.annotationId).catch(
    filterError(ResourceNotFoundError, () => {
      this.throw(404, 'Annotation not found');
    })
  );

  this.status = 204;
}

function* getList(this: AuthedContext): Iterator<any, any, any> {
  const query: GetListQuery = this.query;
  if (!query.canvasId) {
    this.throw(400, 'Missing canvasId');
  }

  const annotations =
    query.hasComments !== 'true'
      ? yield findAllByCanvasId(query.canvasId)
      : yield findAllWithCommentsByCanvasId(query.canvasId);

  this.status = 200;
  this.body = annotations;
}

function* getAnnotationComments(this: AuthedContext): Iterator<any, any, any> {
  const comments = yield AnnotationCommentDAO.findByAnnotationId(
    this.params.annotationId
  );
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

router.get('/:annotationId/comments', requireAuth, getAnnotationComments);

export default router.routes();
