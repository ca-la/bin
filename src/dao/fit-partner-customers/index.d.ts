import FitPartnerCustomer = require('../../domain-objects/fit-partner-customer');

interface PhoneCustomer {
  partnerId: string;
  phone: string;
}

interface ShopifyCustomer {
  partnerId: string;
  shopifyUserId: string;
}

type FindOrCreateOptions = PhoneCustomer | ShopifyCustomer;

declare namespace FitPartnerCustomersDAO {
  function findById(id: string): Promise<FitPartnerCustomer | null>;
  function findOrCreate(
    options: FindOrCreateOptions
  ): Promise<FitPartnerCustomer>;
}

export = FitPartnerCustomersDAO;
