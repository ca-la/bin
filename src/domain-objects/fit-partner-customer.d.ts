declare class FitPartnerCustomer {
  public id: string;
  public createdAt: Date;
  public partnerId: string;
  public shopifyUserId: string;

  constructor(data: any);
}

export = FitPartnerCustomer;
