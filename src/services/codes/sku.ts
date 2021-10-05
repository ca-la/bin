import { padStart } from "lodash";
import Knex from "knex";

import { VariantDb } from "../../components/product-design-variants/types";
import { TABLE_NAME as VARIANTS_TABLE } from "../../components/product-design-variants/dao";
import * as ProductDesignsDAO from "../../components/product-designs/dao";
import TeamsDAO from "../../components/teams/dao";
import db from "../../services/db";

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

  const nameByWords = abbreviateSingleWord
    ? name.split(/[\s\-]/)
    : name.replace(/-/, "").split(/\s/);

  const words = nameByWords.filter((w: string) => w.length > 0);

  return words
    .map((word: string) => (abbreviateSingleWord ? word[0] : word.slice(0, 3)))
    .join("");
}

export function formatSequenceValue(sequenceValue: number): string {
  return padStart(String(sequenceValue), 7, "0");
}

/**
 * Computes a SKU based on a variant details.
 * Format: team-collection-design-color-size
 */
export async function computeSku(
  ktx: Knex,
  variant: Uninserted<VariantDb>
): Promise<string> {
  const design = await ProductDesignsDAO.findById(
    variant.designId,
    null,
    {},
    ktx
  );
  if (!design) {
    throw new Error(`Could not find design for variant #${variant.id}`);
  }
  const collection = design.collections && design.collections[0];
  const collectionPart =
    collection && collection.title ? abbreviate(collection.title) : "";

  const team = await TeamsDAO.findByDesign(ktx, design.id);
  const teamPart = team ? abbreviate(team.title) : "";

  const designPart = abbreviate(design.title);

  const colorPart = variant.colorName ? abbreviate(variant.colorName) : "";

  const sizePart = variant.sizeName
    ? abbreviate(variant.sizeName, { abbreviateSingleWord: true })
    : "";

  const skuParts = [
    teamPart,
    collectionPart,
    designPart,
    colorPart,
    sizePart,
  ].filter((part: string) => Boolean(part));
  return skuParts.join("-");
}

/**
 * Computes a unique SKU based on a variant details.
 *
 * Format: team-collection-design-color-size[-number]
 * `number` is used to avoid duplications
 * `number` calculated using DB lookup and by using
 * unsaved variants those might be calculated in one go,
 * before inserting/updating.
 */
export async function computeUniqueSku(
  ktx: Knex,
  variant: Uninserted<VariantDb>,
  unsavedVariants: Uninserted<VariantDb>[] = []
): Promise<string> {
  const computedSku = await computeSku(ktx, variant);

  const uniqueSku = await makeSkuUnique(
    ktx,
    {
      ...variant,
      sku: computedSku,
    },
    unsavedVariants
  );

  return uniqueSku;
}

/* Append "-number" to the SKU to make it unique */
async function makeSkuUnique(
  ktx: Knex,
  variant: Uninserted<VariantDb> & { sku: string },
  unsavedVariants: Uninserted<VariantDb>[] = []
): Promise<string> {
  const { sku, id: variantId } = variant;

  const variantIdsToExclude = [
    variantId,
    ...unsavedVariants.map((variantDb: Uninserted<VariantDb>) => {
      return variantDb.id;
    }),
  ];
  const skuRegexpString = `^${sku}(-\\d+)?$`;
  const skuRawRegexp = db.raw(skuRegexpString.replace("?", "\\?"));
  const query = ktx(VARIANTS_TABLE)
    .select("sku")
    .whereRaw("sku ~ '?'", [skuRawRegexp])
    .whereNotIn("id", variantIdsToExclude)
    .whereNotNull("sku");

  const similarSkusFromDb: string[] = await query.then(
    (rows: { sku: string }[]) => rows.map((row: { sku: string }) => row.sku)
  );

  const skusFromUnsavedVariants = unsavedVariants.map(
    (variantDb: Uninserted<VariantDb>) => {
      return variantDb.sku;
    }
  );

  const skuRegexp = new RegExp(skuRegexpString);
  const similarSkusFromUnsavedVariants: string[] = skusFromUnsavedVariants.filter(
    (unsavedSku: string | null): unsavedSku is string => {
      if (unsavedSku === null) {
        return false;
      }

      return skuRegexp.test(unsavedSku);
    }
  );

  const similarSkus = [...similarSkusFromDb, ...similarSkusFromUnsavedVariants];

  if (similarSkus.length === 0) {
    return sku;
  }

  const genericSkuIndex = similarSkus.indexOf(sku);
  const isThisSkuUnique = genericSkuIndex === -1;
  if (isThisSkuUnique) {
    return sku;
  }

  const uniqueNumber = getUniqueSkuNumber(sku, similarSkus);

  const uniqueSku = `${sku}-${uniqueNumber}`;
  return uniqueSku;
}

const SKU_UNIQUENESS_START_NUMBER = 2;

export function getUniqueSkuNumber(sku: string, similarSkus: string[]): number {
  const usedNumbers: number[] = similarSkus
    .reduce((acc: number[], similarSku: string) => {
      const splitSku = similarSku.split(`${sku}-`);
      const skuNumber = Number(splitSku[1]);

      // ignoring zero's and NaN, we need indexes started from 2
      if (skuNumber >= SKU_UNIQUENESS_START_NUMBER) {
        acc.push(skuNumber);
      }
      return acc;
    }, [])
    .sort((a: number, b: number) => a - b);

  const isNoDuplicatesWithNumber = usedNumbers.length === 0;
  if (isNoDuplicatesWithNumber) {
    return SKU_UNIQUENESS_START_NUMBER;
  }

  const maxUsedNumber = usedNumbers[usedNumbers.length - 1];
  return maxUsedNumber + 1;
}
