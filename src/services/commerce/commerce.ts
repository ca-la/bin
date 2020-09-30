import { Transaction } from "knex";
import { updateEmptySkuByUpc } from "../../components/product-design-variants/dao";
import db from "../db";
import * as CommerceAPI from "./api";

export interface UpcSkuMatching {
  upc: string;
  sku: string;
}

function isUpcSkuMatching(matching: any): matching is UpcSkuMatching {
  return (
    matching &&
    typeof matching.upc === "string" &&
    typeof matching.sku === "string"
  );
}

function isUpcSkuMatchings(matchings: any): matchings is UpcSkuMatching[] {
  return (
    Array.isArray(matchings) &&
    matchings.every((matching: any) => isUpcSkuMatching(matching))
  );
}

export async function fillSkus(storefrontId: string): Promise<number> {
  const response = await CommerceAPI.fetchCommerce(
    `storefronts/${storefrontId}/upc-sku-matchings`
  );

  if (response.status !== 200) {
    const text = await response.text();
    throw new Error(text);
  }

  const matchings = await response.json();
  if (!isUpcSkuMatchings(matchings)) {
    throw new Error(`Commerce returned matchings in a wrong format`);
  }

  let updatedCount = 0;
  await db.transaction(async (trx: Transaction) => {
    for (const matching of matchings) {
      const updated = await updateEmptySkuByUpc(
        trx,
        matching.upc,
        matching.sku
      );
      updatedCount += updated.length;
    }
  });

  return updatedCount;
}
