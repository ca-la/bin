import { omit } from "lodash";

import * as CanvasesDAO from "../dao";
import * as ComponentsDAO from "../../components/dao";
import Asset from "../../assets/types";
import ProductDesignOptionsDAO from "../../../components/product-design-options/dao";
import {
  createProductDesignOptionSchema,
  CreateProductDesignOption,
} from "../../../components/product-design-options/types";
import * as AssetsDAO from "../../assets/dao";
import {
  Component,
  componentSchema,
  ComponentType,
} from "../../components/types";
import { deserializeAsset } from "../../assets/services/serializer";
import { logServerError } from "../../../services/logger";
import { Serialized } from "../../../types/serialized";
import Canvas from "./../domain-object";
import * as EnrichmentService from "../../../services/enrich-component";
import Knex from "knex";
import { CanvasWithEnrichedComponents } from "../types";
import { EnrichedComponent } from "..";

export type ComponentWithImageAndOption = Component & {
  image: Serialized<Asset>;
  option?: Serialized<CreateProductDesignOption>;
};

export type CanvasWithComponent = Canvas & {
  components: ComponentWithImageAndOption[];
};

export async function createCanvasAndComponents(
  trx: Knex.Transaction,
  userId: string,
  data: MaybeUnsaved<CanvasWithComponent>
): Promise<CanvasWithEnrichedComponents> {
  const enrichedComponents: EnrichedComponent[] = [];
  for (const component of data.components) {
    const componentWithAssetLinks = await createComponent(
      trx,
      {
        ...component,
        createdAt: component.createdAt
          ? new Date(component.createdAt)
          : new Date(),
      },
      userId
    );
    enrichedComponents.push(componentWithAssetLinks);
  }

  const withoutComponents = omit(data, "components");
  const createdCanvas = await CanvasesDAO.create(withoutComponents, trx);
  return { ...createdCanvas, components: enrichedComponents };
}

async function createComponent(
  trx: Knex.Transaction,
  component: ComponentWithImageAndOption,
  userId: string
) {
  const { image } = component;
  const deserializedImage = deserializeAsset(image);
  await AssetsDAO.create(
    {
      ...deserializedImage,
      userId,
    },
    trx
  );

  if (component.type === ComponentType.Material) {
    const safeOption = createProductDesignOptionSchema.safeParse(
      component.option
    );
    if (!safeOption.success) {
      logServerError(safeOption.error);
      throw new Error("Could not create product design option");
    }
    await ProductDesignOptionsDAO.create(trx, {
      deletedAt: null,
      patternImageId: null,
      isBuiltinOption: false,
      ...safeOption.data,
    });
  }

  const safeComponent = componentSchema.safeParse(component);

  if (!safeComponent.success) {
    logServerError(safeComponent.error);
    throw new Error("Could not create component");
  }
  const created = await ComponentsDAO.create(safeComponent.data, trx);
  return EnrichmentService.enrichComponent(trx, created);
}
