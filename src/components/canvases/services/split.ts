import Knex from "knex";
import { flatten } from "lodash";

import * as ComponentsDAO from "../../components/dao";
import * as CanvasesDAO from "../dao";
import * as SplitComponentService from "../../components/split";
import Canvas from "../domain-object";
import { Component } from "../../components/types";

export interface Result {
  canvas: Canvas;
  components: Component[];
}

export async function splitCanvas(
  trx: Knex.Transaction,
  originalCanvas: Canvas
): Promise<Result[]> {
  const components = await ComponentsDAO.findAllByCanvasId(originalCanvas.id);

  if (components.length === 0) {
    throw new Error(`No components on canvas ${originalCanvas.id} to split`);
  }

  const splitComponents: Component[] = flatten(
    await Promise.all(
      components.map((component: Component) =>
        SplitComponentService.splitComponent(trx, component)
      )
    )
  );

  const results: Result[] = await Promise.all(
    splitComponents.map(async (component: Component, index: number) => {
      const canvas = await CanvasesDAO.create(
        {
          designId: originalCanvas.designId,
          createdBy: originalCanvas.createdBy,
          componentId: component.id,
          title: `${originalCanvas.title} (Page ${index + 1})`,
          width: originalCanvas.width,
          height: originalCanvas.height,
          x: originalCanvas.x,
          y: originalCanvas.y,
          archivedAt: null,
        },
        trx
      );
      return { components: [component], canvas };
    })
  );

  await CanvasesDAO.del(trx, originalCanvas.id);

  return results;
}
