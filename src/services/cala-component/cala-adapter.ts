import * as z from "zod";
import { CalaAdapter } from "./types";
import DataAdapter, {
  DataTransformer,
  defaultDecoder,
  defaultEncoder,
} from "../data-adapter";
import { validate, validateEvery } from "../validate-from-db";
import { hasProperties } from "../require-properties";
import { check } from "../check";

interface AdapterOptions<Model, ModelRow extends object> {
  domain: string;
  requiredProperties: (keyof Model)[];
  encodeTransformer?: DataTransformer<ModelRow, Model>;
  decodeTransformer?: DataTransformer<Model, ModelRow>;
  insertionTransformer?: DataTransformer<
    Uninserted<Model>,
    Uninserted<ModelRow>
  >;
}

export function fromSchema<
  Model extends Record<string, unknown>,
  ModelRow extends Record<string, unknown>
>({
  modelSchema,
  rowSchema,
  encodeTransformer = defaultEncoder,
}: {
  modelSchema: z.ZodSchema<Model, z.ZodTypeDef, Record<string, unknown>>;
  rowSchema: z.ZodSchema<ModelRow, z.ZodTypeDef, Record<string, unknown>>;
  encodeTransformer?: DataTransformer<ModelRow, Model>;
}): CalaAdapter<Model, ModelRow> {
  const decodeTransformer = modelSchema
    .transform(defaultDecoder)
    .transform(rowSchema.parse).parse;
  const insertionTransformer = decodeTransformer;

  const dataAdapter = new DataAdapter<ModelRow, Model>(
    encodeTransformer,
    decodeTransformer,
    insertionTransformer
  );

  const partialDataAdapter = new DataAdapter<
    Partial<ModelRow>,
    Partial<Model>
  >();

  const isRow = (candidate: unknown): candidate is ModelRow =>
    check(rowSchema, candidate);

  const isModel = (candidate: unknown): candidate is Model =>
    check(modelSchema, candidate);

  return {
    dataAdapter,
    isRow,
    isModel,
    toDb: (item: Model): ModelRow => {
      return dataAdapter.toDb(item);
    },
    toDbArray: (items: Model[]): ModelRow[] => {
      return items.map(dataAdapter.toDb.bind(dataAdapter));
    },
    forInsertion: (item: Model): Uninserted<ModelRow> => {
      return dataAdapter.forInsertion(item);
    },
    forInsertionArray: (items: Model[]): Uninserted<ModelRow>[] => {
      return items.map(dataAdapter.forInsertion.bind(dataAdapter));
    },
    toDbPartial: (item: Partial<Model>): Partial<ModelRow> => {
      if (Object.keys(item).length === 0) {
        return {};
      }
      return partialDataAdapter.toDb(item);
    },
    fromDb: (item: ModelRow): Model => {
      return dataAdapter.parse(item);
    },
    fromDbArray: (items: ModelRow[]): Model[] => {
      return items.map(dataAdapter.parse.bind(dataAdapter));
    },
  };
}

export function buildAdapter<Model extends object, ModelRow extends object>({
  domain,
  encodeTransformer = defaultEncoder,
  decodeTransformer = defaultDecoder,
  insertionTransformer = defaultDecoder,
  requiredProperties,
}: AdapterOptions<Model, ModelRow>): CalaAdapter<Model, ModelRow> {
  const dataAdapter = new DataAdapter<ModelRow, Model>(
    encodeTransformer,
    decodeTransformer,
    insertionTransformer
  );

  const partialDataAdapter = new DataAdapter<
    Partial<ModelRow>,
    Partial<Model>
  >();

  const isModel = (item: any): item is Model => {
    return hasProperties(item, ...requiredProperties);
  };

  const isRow = (item: any): item is ModelRow => {
    return isModel(dataAdapter.parse(item));
  };

  return {
    dataAdapter,
    isRow,
    isModel,
    toDb: (item: Model): ModelRow => {
      return dataAdapter.toDb(item);
    },
    toDbArray: (items: Model[]): ModelRow[] => {
      return items.map(dataAdapter.toDb.bind(dataAdapter));
    },
    forInsertion: (item: Model): Uninserted<ModelRow> => {
      return dataAdapter.forInsertion(item);
    },
    forInsertionArray: (items: Model[]): Uninserted<ModelRow>[] => {
      return items.map(dataAdapter.forInsertion.bind(dataAdapter));
    },
    toDbPartial: (item: Partial<Model>): Partial<ModelRow> => {
      if (Object.keys(item).length === 0) {
        return {};
      }
      return partialDataAdapter.toDb(item);
    },
    fromDb: (item: ModelRow): Model => {
      return validate<ModelRow, Model>(domain, isRow, dataAdapter, item);
    },
    fromDbArray: (items: ModelRow[]): Model[] => {
      return validateEvery<ModelRow, Model>(domain, isRow, dataAdapter, items);
    },
  };
}
