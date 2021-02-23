import { hasProperties } from "@cala/ts-lib";

import {
  dataAdapter as baseDataAdapter,
  isProductDesignRow,
  ProductDesignData,
  ProductDesignRow,
} from "./product-designs-new";
import DesignEvent, { DesignEventRow } from "../../design-events/types";
import eventDataAdapter from "../../design-events/adapter";
import {
  dbDataAdapter as costInputDataAdapter,
  PricingCostInputDb,
  PricingCostInputDbRow,
} from "../../pricing-cost-inputs/domain-object";
import DataAdapter from "../../../services/data-adapter";

export interface ProductDesignDataWithMeta extends ProductDesignData {
  collectionId: string;
  costInputs: PricingCostInputDb[];
  events: DesignEvent[];
}

export interface ProductDesignRowWithMeta extends ProductDesignRow {
  collection_id: string;
  cost_inputs: PricingCostInputDbRow[] | null;
  events: DesignEventRow[] | null;
}

const encode = (row: ProductDesignRowWithMeta): ProductDesignDataWithMeta => {
  const { cost_inputs, events: eventRows, ...baseRow } = row;
  const events =
    eventRows === null ? [] : eventDataAdapter.fromDbArray(eventRows);
  const costInputs =
    cost_inputs === null
      ? []
      : cost_inputs.map((costInputRow: PricingCostInputDbRow) =>
          costInputDataAdapter.parse(costInputRow)
        );

  return {
    ...baseDataAdapter.parse(baseRow),
    collectionId: row.collection_id,
    costInputs,
    events,
  };
};

export const withMetaDataAdapter = new DataAdapter<
  ProductDesignRowWithMeta,
  ProductDesignDataWithMeta
>(encode);

export function isProductDesignRowWithMeta(
  row: any
): row is ProductDesignRowWithMeta {
  return (
    isProductDesignRow(row) &&
    hasProperties(row, "collection_id", "cost_inputs", "events")
  );
}
