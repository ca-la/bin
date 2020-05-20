import * as Knex from "knex";
import db from "../db";
import { ProviderName } from "../../components/storefronts/tokens/domain-object";
import Storefront from "../../components/storefronts/domain-object";
import * as StorefrontsDAO from "../../components/storefronts/dao";
import * as StorefrontTokensDAO from "../../components/storefronts/tokens/dao";
import * as StorefrontUsersDAO from "../../components/storefronts/users/dao";

interface CreateStorefrontOptions {
  accessToken: string;
  baseUrl: string;
  name: string;
  providerName: ProviderName;
  userId: string;
}

export function createStorefront(
  options: CreateStorefrontOptions
): Promise<Storefront> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const storefront = await StorefrontsDAO.create({
      data: {
        createdBy: options.userId,
        name: options.name,
      },
      trx,
    });
    await StorefrontUsersDAO.create({
      data: {
        storefrontId: storefront.id,
        userId: options.userId,
      },
      trx,
    });
    await StorefrontTokensDAO.create({
      data: {
        baseUrl: options.baseUrl,
        createdBy: options.userId,
        providerName: options.providerName,
        storefrontId: storefront.id,
        token: options.accessToken,
      },
      trx,
    });

    return storefront;
  });
}
