import {
  dataAdapter as baseDataAdapter,
  isProductDesignRow,
  ProductDesignData,
  ProductDesignRow
} from './product-designs-new';
import DesignEvent, {
  dataAdapter as eventDataAdapter,
  DesignEventRow
} from '../../../domain-objects/design-event';
import {
  baseDataAdapter as costInputDataAdapter,
  BasePricingCostInput,
  BasePricingCostInputRow
} from '../../pricing-cost-inputs/domain-object';
import DataAdapter from '../../../services/data-adapter';
import { hasProperties } from '@cala/ts-lib';

export interface ProductDesignDataWithMeta extends ProductDesignData {
  costInputs: BasePricingCostInput[];
  events: DesignEvent[];
}

export interface ProductDesignRowWithMeta extends ProductDesignRow {
  cost_inputs: BasePricingCostInputRow[] | null;
  events: DesignEventRow[] | null;
}

const encode = (row: ProductDesignRowWithMeta): ProductDesignDataWithMeta => {
  const { cost_inputs, events: eventRows, ...baseRow } = row;
  const events =
    eventRows === null
      ? []
      : eventRows.map((eventRow: DesignEventRow) =>
          eventDataAdapter.parse(eventRow)
        );
  const costInputs =
    cost_inputs === null
      ? []
      : cost_inputs.map((costInputRow: BasePricingCostInputRow) =>
          costInputDataAdapter.parse(costInputRow)
        );

  return {
    ...baseDataAdapter.parse(baseRow),
    costInputs,
    events
  };
};

export const withMetaDataAdapter = new DataAdapter<
  ProductDesignRowWithMeta,
  ProductDesignDataWithMeta
>(encode);

export function isProductDesignRowWithMeta(
  row: any
): row is ProductDesignRowWithMeta {
  return isProductDesignRow(row) && hasProperties(row, 'cost_inputs', 'events');
}
