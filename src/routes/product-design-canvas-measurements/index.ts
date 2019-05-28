import * as Router from 'koa-router';
import * as Koa from 'koa';
import Measurement from '../../domain-objects/product-design-canvas-measurement';
import * as MeasurementsDAO from '../../dao/product-design-canvas-measurements';
import { hasOnlyProperties } from '../../services/require-properties';

import filterError = require('../../services/filter-error');
import InvalidDataError = require('../../errors/invalid-data');
import requireAuth = require('../../middleware/require-auth');
import * as NotificationsService from '../../services/create-notifications';

const router = new Router();

interface GetListQuery {
  canvasId?: string;
}

type MeasurementNotFoundError = MeasurementsDAO.MeasurementNotFoundError;
const { MeasurementNotFoundError } = MeasurementsDAO;

function isMeasurement(candidate: object): candidate is Measurement {
  return hasOnlyProperties(
    candidate,
    'id',
    'createdAt',
    'canvasId',
    'createdBy',
    'deletedAt',
    'label',
    'measurement',
    'name',
    'startingX',
    'startingY',
    'endingX',
    'endingY'
  );
}

const measurementFromIO = (
  request: Measurement,
  userId: string
): Measurement => {
  return {
    ...request,
    createdBy: userId
  };
};

function* createMeasurement(
  this: Koa.Application.Context
): AsyncIterableIterator<Measurement> {
  const body = this.request.body;
  if (body && isMeasurement(body)) {
    const measurement = yield MeasurementsDAO.create(
      measurementFromIO(body, this.state.userId)
    );
    NotificationsService.sendDesignOwnerMeasurementCreateNotification(
      body.id,
      body.canvasId,
      this.state.userId
    );
    this.status = 201;
    this.body = measurement;
  } else {
    this.throw(400, 'Request does not match ProductDesignCanvasMeasurement');
  }
}

function* updateMeasurement(
  this: Koa.Application.Context
): AsyncIterableIterator<Measurement> {
  const body = this.request.body;
  if (body && isMeasurement(body)) {
    const measurement = yield MeasurementsDAO.update(
      this.params.measurementId,
      body
    )
      .catch(
        filterError(InvalidDataError, (err: InvalidDataError) =>
          this.throw(400, err)
        )
      )
      .catch(
        filterError(MeasurementNotFoundError, (err: MeasurementNotFoundError) =>
          this.throw(404, err)
        )
      );

    this.status = 200;
    this.body = measurement;
  } else {
    this.throw(400, 'Request does not match ProductDesignCanvasMeasurement');
  }
}

function* deleteMeasurement(
  this: Koa.Application.Context
): AsyncIterableIterator<Measurement> {
  const measurement = yield MeasurementsDAO.deleteById(
    this.params.measurementId
  ).catch(
    filterError(MeasurementNotFoundError, (err: MeasurementNotFoundError) =>
      this.throw(404, err)
    )
  );

  if (!measurement) {
    this.throw(400, 'Failed to delete the measurement');
  }

  this.status = 204;
}

function* getList(
  this: Koa.Application.Context
): AsyncIterableIterator<Measurement> {
  const query: GetListQuery = this.query;
  if (!query.canvasId) {
    return this.throw('Missing canvasId');
  }

  const measurements = yield MeasurementsDAO.findAllByCanvasId(query.canvasId);
  this.status = 200;
  this.body = measurements;
}

function* getLabel(
  this: Koa.Application.Context
): AsyncIterableIterator<string> {
  const query: GetListQuery = this.query;

  if (!query.canvasId) {
    return this.throw('Missing canvasId');
  }

  const label = yield MeasurementsDAO.getLabel(query.canvasId);
  this.status = 200;
  this.body = label;
}

router.get('/', requireAuth, getList);
router.get('/label', requireAuth, getLabel);
router.put('/:measurementId', requireAuth, createMeasurement);
router.patch('/:measurementId', requireAuth, updateMeasurement);
router.del('/:measurementId', requireAuth, deleteMeasurement);

export = router.routes();
