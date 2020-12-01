export interface Variant {
  id: string;
  createdAt: Date;
  designId: string;
  colorName: string | null;
  sizeName: string | null;
  unitsToProduce: number;
  position: number;
  colorNamePosition: number;
  universalProductCode: string | null;
  sku?: string | null;
  isSample: boolean;
}

export type VariantDb = Omit<Variant, "sku"> & {
  sku: string | null;
};

export type ProductDesignVariantIO = Uninserted<VariantDb>;
