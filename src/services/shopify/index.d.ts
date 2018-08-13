interface Options {
  appApiKey: string;
  appPassword: string;
  storeBase: string;
}

declare namespace ShopifyClient {
  interface ShopifyMetafieldDefinition {
    id: string;
    key: string;
    value: string;
    value_type: 'string';
    namespace: string;
  }
}

declare class ShopifyClient {
  constructor(options: Options);

  public getCustomerMetafields(
    customerId: string
  ): Promise<ShopifyClient.ShopifyMetafieldDefinition[]>;

  public deleteMetafield(metafieldId: string): Promise<void>;
  public updateCustomer(customerId: string, data: any): Promise<void>;
}

export = ShopifyClient;
