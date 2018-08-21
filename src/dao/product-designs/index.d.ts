import ProductDesign = require('../../domain-objects/product-design');

type UnsavedDesign = Unsaved<ProductDesign>;

declare namespace ProductDesignsDAO {
  function create(data: UnsavedDesign): Promise<ProductDesign>;
}

export = ProductDesignsDAO;
