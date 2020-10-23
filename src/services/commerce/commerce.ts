import { Transaction } from "knex";
import qs from "querystring";
import {
  updateEmptySkuByUpc,
  findByDesignId,
} from "../../components/product-design-variants/dao";
import db from "../db";
import * as CommerceAPI from "./api";
import { VariantDb } from "../../components/product-design-variants/types";

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

export async function fetchProductInfo(designId: string) {
  return await db.transaction(async (trx: Transaction) => {
    const variants = await findByDesignId(designId, trx);
    const skus = variants.map((variant: VariantDb) => variant.sku);
    if (skus.length === 0) {
      return [];
    }
    const response = await CommerceAPI.fetchCommerce(
      `storefront-products?sku=${skus.join(",")}`
    );

    if (response.status !== 200) {
      const text = await response.text();
      throw new Error(text);
    }

    return response.json();
  });
}

export async function fetchProductVariants(
  designId: string,
  storefrontId: string,
  externalProductId: string | null
) {
  return await db.transaction(async (trx: Transaction) => {
    const variants = await findByDesignId(designId, trx);
    const skus = variants.map((variant: VariantDb) => variant.sku);
    if (skus.length === 0) {
      return [];
    }
    const query = qs.stringify({
      sku: skus.join(","),
      storefrontId,
      ...(externalProductId !== null ? { externalProductId } : {}),
    });
    const response = await CommerceAPI.fetchCommerce(
      `storefront-product-variants?${query}`
    );

    if (response.status !== 200) {
      const text = await response.text();
      throw new Error(text);
    }

    return response.json();
  });
}
