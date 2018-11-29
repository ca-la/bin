import ProductDesign = require('../../domain-objects/product-design');

type UnsavedDesign = Unsaved<ProductDesign>;
type UninsertedDesign = Uninserted<ProductDesign>;

interface ProductDesignWithCollectionId extends ProductDesign {
  collectionIds: [string];
}

declare namespace ProductDesignsDAO {
  function create(data: UnsavedDesign): Promise<ProductDesign>;
  function findById(
    id: string,
    filters?: object | null,
    options?: object | null
  ): Promise<ProductDesignWithCollectionId | null>;
  function findByCollectionId(collectionId: string): Promise<ProductDesign[]>;
  function findByQuoteId(id: string): Promise<ProductDesign | null>;
  function update(id: string, data: Partial<ProductDesign>): Promise<ProductDesign>;
  function deleteById(id: string): Promise<ProductDesign>;
}

export = ProductDesignsDAO;
