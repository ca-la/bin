declare class FitPartnerCustomer {
  public id: string;
  public createdAt: Date;
  public partnerId: string;
  public shopifyUserId?: string;
  public phone?: string;

  constructor(data: any);
}

export = FitPartnerCustomer;
