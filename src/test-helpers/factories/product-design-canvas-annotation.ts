import Knex from "knex";
import uuid from "node-uuid";

import { findById as findUserById } from "../../components/users/dao";
import createUser from "../create-user";
import * as CanvasesDAO from "../../components/canvases/dao";
import { AnnotationDb as Annotation } from "../../components/product-design-canvas-annotations/types";
import { create } from "../../components/product-design-canvas-annotations/dao";
import generateCanvas from "./product-design-canvas";
import ProductDesignsDAO = require("../../components/product-designs/dao");
import db from "../../services/db";
import { Canvas } from "../../components/canvases/types";

export default async function generateAnnotation(
  options: Partial<Annotation> = {}
) {
  const { user } = options.createdBy
    ? { user: await findUserById(options.createdBy) }
    : await createUser({ withSession: false });
  let canvas: Canvas | null = null;
  let design;
  if (options.canvasId) {
    canvas = await CanvasesDAO.findById(options.canvasId);
    if (canvas === null) {
      throw new Error(`Could not find canvas with id: ${options.canvasId}`);
    }

    design = await ProductDesignsDAO.findById(canvas.designId);

    if (design === null) {
      throw new Error(
        `Could not find design for canvas with id: ${options.canvasId}`
      );
    }
  } else {
    const generated = await generateCanvas({ createdBy: user.id });
    canvas = generated.canvas;
    design = generated.design;
  }

  const annotation = await db.transaction((trx: Knex.Transaction) => {
    if (!canvas) {
      throw new Error("Could not create canvas for annotation");
    }

    return create(trx, {
      canvasId: canvas.id,
      createdBy: user.id,
      deletedAt: null,
      resolvedAt: null,
      id: options.id || uuid.v4(),
      x: options.x || 0,
      y: options.y || 0,
    });
  });

  return {
    annotation,
    canvas,
    createdBy: user,
    design,
  };
}
