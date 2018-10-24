import ProductDesign = require('../../domain-objects/product-design');

type UnsavedDesign = Unsaved<ProductDesign>;

declare namespace ProductDesignsDAO {
  function create(data: UnsavedDesign): Promise<ProductDesign>;
  function findById(id: string): Promise<ProductDesign | null>;
}

export = ProductDesignsDAO;
