import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

export default interface ProductDesignVariant {
  colorName: string | null;
  createdAt: Date;
  designId: string;
  id: string;
  position: number;
  sizeName: string | null;
  unitsToProduce: number;
}

export interface ProductDesignVariantRow {
  color_name: string | null;
  created_at: Date;
  design_id: string;
  id: string;
  position: number;
  size_name: string | null;
  units_to_produce: number;
}

export const dataAdapter = new DataAdapter<ProductDesignVariantRow, ProductDesignVariant>();

export function isProductDesignVariantRow(candidate: object): candidate is ProductDesignVariantRow {
  return hasProperties(
    candidate,
    'color_name',
    'created_at',
    'design_id',
    'id',
    'position',
    'size_name',
    'units_to_produce'
  );
}
