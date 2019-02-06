import User = require('./user');

declare class Session {
  public id: string;
  public userId: string;
  public createdAt: Date;
  public role: 'USER' | 'PARTNER' | 'ADMIN';
  public expiresAt: Date | null;

  public setUser(user: User): void;
}

export = Session;
