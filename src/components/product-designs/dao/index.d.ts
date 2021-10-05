import Knex from "knex";
import ProductDesign = require("../domain-objects/product-design");
import ProductDesignWithApprovalSteps from "../domain-objects/product-design-with-approval-steps";

interface ProductDesignWithCollectionId extends ProductDesign {
  collectionIds: string[];
}

declare namespace ProductDesignsDAO {
  function findById(
    id: string,
    filters?: object | null,
    options?: { includeDeleted?: boolean; bidUserId?: string | null },
    ktx?: Knex
  ): Promise<
    (ProductDesignWithCollectionId & ProductDesignWithApprovalSteps) | null
  >;
  function findByIds(ids: string[]): Promise<ProductDesignWithCollectionId[]>;
  function findByCollectionId(
    collectionId: string,
    trx?: Knex.Transaction
  ): Promise<ProductDesign[]>;
  function findByQuoteId(ktx: Knex, id: string): Promise<ProductDesign | null>;
  function update(
    id: string,
    data: Partial<ProductDesign>
  ): Promise<ProductDesign>;
  function queryWithCollectionMeta(db: Knex): Knex.QueryBuilder;
}

export = ProductDesignsDAO;
