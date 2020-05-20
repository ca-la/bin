import { create } from "./service";
import { DesignAndVariantToShopifyIds, hasProperties } from "@cala/ts-lib";

function isDesignAndVariantToShopifyIds(
  data: object
): data is DesignAndVariantToShopifyIds {
  return hasProperties(data, "design", "variants");
}

export function* createDesignAndVariant(
  this: AuthedContext
): Iterator<any, any, any> {
  const { body } = this.request;

  if (body && isDesignAndVariantToShopifyIds(body)) {
    yield create(body);
    this.status = 204;
  } else {
    this.throw(400, "Cannot create shopify ids with the supplied object.");
  }
}
