export default interface PartnerPayoutAccount {
  id: string;
  createdAt: Date | null;
  deletedAt: Date | null;
  userId: string;
  stripeAccessToken: string;
  stripeRefreshToken: string;
  stripePublishableKey: string;
  stripeUserId: string;
}
