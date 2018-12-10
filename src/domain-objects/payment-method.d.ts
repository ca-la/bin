declare class PaymentMethod {
  public id: string;
  public createdAt: Date;
  public deletedAt: Date;
  public userId: string;
  public stripeCustomerId: string;
  public stripeSourceId: string;
  public lastFourDigits: string;

  constructor(data: any);
}

export = PaymentMethod;
