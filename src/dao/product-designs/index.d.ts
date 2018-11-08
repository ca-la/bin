import ProductDesign = require('../../domain-objects/product-design');

type UnsavedDesign = Unsaved<ProductDesign>;
type UninsertedDesign = Uninserted<ProductDesign>;

declare namespace ProductDesignsDAO {
  function create(data: UnsavedDesign): Promise<ProductDesign>;
  function findById(id: string): Promise<ProductDesign | null>;
  function update(id: string, data: Partial<ProductDesign>): Promise<ProductDesign>;
}

export = ProductDesignsDAO;
