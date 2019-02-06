import PublicUser from './public-user';

declare class User {
  public createdAt: Date;
  public email: string;
  public id: string;
  public name: string;
  public passwordHash: string;
  public isSmsPreregistration: boolean;
  public phone: string;
  public referralCode: string;
  public role: string;

  public toPublicJSON: () => PublicUser;

  constructor(data: any);
}

export = User;
