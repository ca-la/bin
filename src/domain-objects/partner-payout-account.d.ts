declare class PartnerPayoutAccount {
  public static dataMapper: any;
  public id: string;
  public createdAt: Date;
  public deletedAt: Date | null;
  public userId: string;
  public stripeAccessToken: string;
  public stripeRefreshToken: string;
  public stripePublishableKey: string;
  public stripeUserId: string;

  constructor(data: any);
}

export default PartnerPayoutAccount;
