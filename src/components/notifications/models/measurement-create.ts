import {
  BaseFullNotification,
  BaseFullNotificationRow,
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

type BaseFullRow = Omit<
  BaseFullNotificationRow & MeasurementCreateNotificationRow,
  'collection_title' | 'component_type' | 'design_title'
>;

export interface FullMeasurementCreateNotificationRow extends BaseFullRow {
  collection_title: string | null;
  component_type: string;
  design_title: string | null;
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

type BaseFull = Omit<
  BaseFullNotification & MeasurementCreateNotification,
  'collectionTitle' | 'componentType' | 'designTitle'
>;

export interface FullMeasurementCreateNotification extends BaseFull {
  collectionTitle: string | null;
  componentType: string;
  designTitle: string | null;
}

export function isMeasurementCreateNotification(
  candidate: any
): candidate is MeasurementCreateNotification {
  return candidate.type === NotificationType.MEASUREMENT_CREATE;
}
