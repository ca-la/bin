import FitPartnerCustomer = require('../../domain-objects/fit-partner-customer');

interface FindOrCreateOptions {
  partnerId: string;
  shopifyUserId: string;
}

declare namespace FitPartnerCustomersDAO {
  function findById(id: string): Promise<FitPartnerCustomer | null>;
  function findOrCreate(
    options: FindOrCreateOptions
  ): Promise<FitPartnerCustomer>;
}

export = FitPartnerCustomersDAO;
