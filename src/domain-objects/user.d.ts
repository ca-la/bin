import PublicUser from './public-user';

export default interface User {
  createdAt: Date;
  email: string;
  id: string;
  name: string;
  passwordHash: string;
  isSmsPreregistration: boolean;
  phone: string;
  referralCode: string;
  role: string;

  toPublicJSON: () => PublicUser;
}
