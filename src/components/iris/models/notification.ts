import { RealtimeBase } from './base';
import { Notification } from '../../notifications/domain-object';

export interface RealtimeNotification extends RealtimeBase<Notification> {
  type: 'notification';
  resource: Notification;
}
