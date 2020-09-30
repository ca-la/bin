import sequenceIncrement from "../sequence-increment";
import { VariantDb } from "../../components/product-design-variants/types";
import * as ProductDesignsDAO from "../../components/product-designs/dao";
import { padStart } from "lodash";
import { Transaction } from "knex";

export const SEQUENCE_NAME = "sku_increment";

export function abbreviate(
  nameRaw: string,
  { abbreviateSingleWord = false }: { abbreviateSingleWord?: boolean } = {}
) {
  const name = nameRaw
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z\-\s]/g, "");

  if (name.length <= 3) {
    return name;
  }

  const words = name.split(/[\s\-]/).filter((w: string) => w.length > 0);
  if (words.length === 1 && !abbreviateSingleWord) {
    return name.slice(0, 3);
  }

  return words.map((word: string) => word[0]).join("");
}

export function formatSequenceValue(sequenceValue: number): string {
  return padStart(String(sequenceValue), 7, "0");
}

/**
 * Computes a unique SKU based on a variant details and sequence in the database.
 */
export async function computeUniqueSku(
  trx: Transaction,
  variant: VariantDb
): Promise<string> {
  const increment = await sequenceIncrement(SEQUENCE_NAME);

  const design = await ProductDesignsDAO.findById(
    variant.designId,
    null,
    {},
    trx
  );
  if (!design) {
    throw new Error(`Could not find design for variant #${variant.id}`);
  }
  const collection = design.collections && design.collections[0];

  const collectionPart =
    collection && collection.title ? `${abbreviate(collection.title)}-` : "";

  const sizePart = variant.sizeName
    ? `${abbreviate(variant.sizeName, { abbreviateSingleWord: true })}-`
    : "";

  const colorPart =
    variant.colorName && variant.colorName !== design.title
      ? `${abbreviate(variant.colorName)}-`
      : "";

  const designPart = `${abbreviate(design.title)}-`;
  const numericPart = formatSequenceValue(increment);

  return `${collectionPart}${designPart}${sizePart}${colorPart}${numericPart}`;
}
