import Knex from "knex";
import ProductDesign = require("../domain-objects/product-design");
import ProductDesignWithApprovalSteps from "../domain-objects/product-design-with-approval-steps";

type UnsavedDesign = Unsaved<ProductDesign>;
type UninsertedDesign = Uninserted<ProductDesign>;

interface ProductDesignWithCollectionId extends ProductDesign {
  collectionIds: string[];
}

declare namespace ProductDesignsDAO {
  function create(
    data: UnsavedDesign,
    trx?: Knex.Transaction
  ): Promise<ProductDesign>;
  function findById(
    id: string,
    filters?: object | null,
    options?: { includeDeleted?: boolean; bidUserId: string | null } | null,
    trx?: Knex.Transaction
  ): Promise<
    (ProductDesignWithCollectionId & ProductDesignWithApprovalSteps) | null
  >;
  function findByIds(ids: string[]): Promise<ProductDesignWithCollectionId[]>;
  function findByCollectionId(
    collectionId: string,
    trx?: Knex.Transaction
  ): Promise<ProductDesign[]>;
  function findByQuoteId(id: string): Promise<ProductDesign | null>;
  function update(
    id: string,
    data: Partial<ProductDesign>
  ): Promise<ProductDesign>;
  function queryWithCollectionMeta(db: Knex): Knex.QueryBuilder;
}

export = ProductDesignsDAO;
