import db from "../../services/db";
import Router from "koa-router";
import Measurement from "./domain-object";
import * as MeasurementsDAO from "./dao";
import { hasOnlyProperties } from "../../services/require-properties";

import filterError = require("../../services/filter-error");
import InvalidDataError from "../../errors/invalid-data";
import requireAuth = require("../../middleware/require-auth");
import * as NotificationsService from "../../services/create-notifications";

const router = new Router();

interface GetListQuery {
  canvasId?: string;
  designId?: string;
}

type MeasurementNotFoundError = MeasurementsDAO.MeasurementNotFoundError;
const { MeasurementNotFoundError } = MeasurementsDAO;

function isMeasurement(candidate: object): candidate is Measurement {
  return hasOnlyProperties(
    candidate,
    "id",
    "createdAt",
    "canvasId",
    "createdBy",
    "deletedAt",
    "label",
    "measurement",
    "name",
    "startingX",
    "startingY",
    "endingX",
    "endingY"
  );
}

const measurementFromIO = (
  request: Measurement,
  userId: string
): Measurement => {
  return {
    ...request,
    createdBy: userId,
  };
};

function* createMeasurement(this: AuthedContext): Iterator<any, any, any> {
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
    this.throw(400, "Request does not match ProductDesignCanvasMeasurement");
  }
}

function* updateMeasurement(this: AuthedContext): Iterator<any, any, any> {
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
    this.throw(400, "Request does not match ProductDesignCanvasMeasurement");
  }
}

function* deleteMeasurement(this: AuthedContext): Iterator<any, any, any> {
  const measurement = yield MeasurementsDAO.deleteById(
    this.params.measurementId
  ).catch(
    filterError(MeasurementNotFoundError, (err: MeasurementNotFoundError) =>
      this.throw(404, err)
    )
  );

  if (!measurement) {
    this.throw(400, "Failed to delete the measurement");
  }

  this.status = 204;
}

function* getList(this: AuthedContext): Iterator<any, any, any> {
  const query: GetListQuery = this.query;

  let measurements = [];
  if (query.canvasId) {
    measurements = yield MeasurementsDAO.findAllByCanvasId(query.canvasId, db);
  } else if (query.designId) {
    measurements = yield MeasurementsDAO.findAllByDesignId(db, query.designId);
  } else {
    this.throw(
      400,
      "Must provide either a canvasId or designId query parameter"
    );
  }

  this.status = 200;
  this.body = measurements;
}

function* getLabel(this: AuthedContext): Iterator<any, any, any> {
  const query: GetListQuery = this.query;

  if (!query.canvasId) {
    this.throw("Missing canvasId");
  }

  const label = yield MeasurementsDAO.getLabel(query.canvasId);
  this.status = 200;
  this.body = label;
}

router.get("/", requireAuth, getList);
router.get("/label", requireAuth, getLabel);
router.put("/:measurementId", requireAuth, createMeasurement);
router.patch("/:measurementId", requireAuth, updateMeasurement);
router.del("/:measurementId", requireAuth, deleteMeasurement);

export = router.routes();
