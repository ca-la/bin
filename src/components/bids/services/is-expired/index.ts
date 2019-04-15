import Bid from '../../domain-object';
import { MILLISECONDS_TO_EXPIRE } from '../../constants';

export function isExpired(bid: Bid): boolean {
  const expiration = new Date(new Date(bid.createdAt).getTime() + MILLISECONDS_TO_EXPIRE);
  return new Date().getTime() > expiration.getTime();
}
