import Knex from "knex";
import uuid from "node-uuid";
import rethrow from "pg-rethrow";
import filterError from "../../services/filter-error";
import {
  buildDao,
  QueryModifier,
  identity,
} from "../../services/cala-component/cala-dao";
import { ProductDesignOption, ProductDesignOptionRow } from "./types";
import dataAdapter from "./adapter";

const TABLE_NAME = "product_design_options";

export function getOptionDefaults(
  option: Partial<ProductDesignOption> = {}
): ProductDesignOption {
  return {
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    isBuiltinOption: false,
    type: "",
    userId: null,
    title: "",
    previewImageId: null,
    patternImageId: null,
    ...option,
  };
}

export const standardDao = buildDao<
  ProductDesignOption,
  ProductDesignOptionRow
>("ProductDesignOption", TABLE_NAME, dataAdapter, {
  orderColumn: "created_at",
  orderDirection: "DESC",
});

function findById(
  ktx: Knex,
  id: string,
  modifier: QueryModifier = identity
): Promise<ProductDesignOption | null> {
  return standardDao
    .findById(ktx, id, modifier)
    .catch(filterError(rethrow.ERRORS.InvalidTextRepresentation, () => null));
}

export default {
  ...standardDao,
  findById,
  getOptionDefaults,
};
