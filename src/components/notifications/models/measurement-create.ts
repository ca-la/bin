import {
  BaseNotification,
  BaseNotificationRow
} from './base';
import { NotificationType } from '../domain-object';

type BaseRow = Omit<
  BaseNotificationRow,
  | 'canvas_id'
  | 'collection_id'
  | 'design_id'
  | 'recipient_user_id'
  | 'measurement_id'
>;
export interface MeasurementCreateNotificationRow extends BaseRow {
  canvas_id: string;
  collection_id: string | null;
  design_id: string;
  measurement_id: string;
  recipient_user_id: string;
  type: NotificationType.MEASUREMENT_CREATE;
}
type Base = Omit<
  BaseNotification,
  'canvasId' | 'collectionId' | 'designId' | 'recipientUserId' | 'measurementId'
>;
export interface MeasurementCreateNotification extends Base {
  canvasId: string;
  collectionId: string | null;
  designId: string;
  measurementId: string;
  recipientUserId: string;
  type: NotificationType.MEASUREMENT_CREATE;
}

export function isMeasurementCreateNotification(
  candidate: any
): candidate is MeasurementCreateNotification {
  return candidate.type === NotificationType.MEASUREMENT_CREATE;
}
