import DataAdapter from '../../services/data-adapter';
import { Variant } from '@cala/ts-lib';
import { hasProperties } from '../../services/require-properties';

export interface ProductDesignVariantRow {
  color_name: string | null;
  color_name_position?: number;
  created_at: Date;
  design_id: string;
  id: string;
  position: number;
  size_name: string | null;
  units_to_produce: number;
  universal_product_code: string | null;
  is_sample: boolean;
}

export const dataAdapter = new DataAdapter<ProductDesignVariantRow, Variant>();

export const partialDataAdapter = new DataAdapter<
  Partial<ProductDesignVariantRow>,
  Partial<Variant>
>();

export function isProductDesignVariantRow(
  candidate: object
): candidate is ProductDesignVariantRow {
  return hasProperties(
    candidate,
    'color_name',
    'color_name_position',
    'created_at',
    'design_id',
    'id',
    'position',
    'size_name',
    'units_to_produce',
    'universal_product_code',
    'is_sample'
  );
}
