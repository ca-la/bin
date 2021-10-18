import { Buffer } from "buffer";

import { RealtimeMessage } from "@cala/ts-lib";
import { uploadToS3 } from "../../services/aws/s3";
import { enqueueMessage } from "../../services/aws/sqs";
import {
  AWS_IRIS_S3_BUCKET,
  AWS_IRIS_SQS_REGION,
  AWS_IRIS_SQS_URL,
} from "../../config";
import { RealtimeDesignEventCreated } from "../design-events/realtime";
import { RealtimeCollectionStatusUpdated } from "../collections/realtime";
import {
  RealtimeApprovalSubmissionUpdated,
  RealtimeApprovalSubmissionCreated,
  RealtimeApprovalSubmissionDeleted,
  RealtimeApprovalSubmissionRevisionRequest,
} from "../approval-step-submissions/realtime";
import { RealtimeApprovalStepUpdated } from "../approval-steps/realtime";
import { RealtimeMessage as GenericRealtimeMessage } from "./types";
import { logServerError } from "../../services/logger";

const MESSAGE_BODY_SIZE_LIMIT_BYTES = 256 * 1024;

type AllRealtimeMessage =
  | RealtimeMessage
  | RealtimeDesignEventCreated
  | RealtimeCollectionStatusUpdated
  | RealtimeApprovalSubmissionUpdated
  | RealtimeApprovalSubmissionCreated
  | RealtimeApprovalSubmissionDeleted
  | RealtimeApprovalSubmissionRevisionRequest
  | RealtimeApprovalStepUpdated
  | GenericRealtimeMessage;

/**
 * Uploads a realtime resource to s3 then enqueues into SQS.
 * @param resource A realtime resource
 */
export async function sendMessage(resource: AllRealtimeMessage): Promise<void> {
  try {
    const resourceString = JSON.stringify(resource);
    const messageSizeInBytes = Buffer.byteLength(resourceString, "utf8");
    const messageSizeExceededUseS3 =
      messageSizeInBytes >= MESSAGE_BODY_SIZE_LIMIT_BYTES;

    if (messageSizeExceededUseS3) {
      const uploadResponse = await uploadToS3({
        acl: "authenticated-read",
        bucketName: AWS_IRIS_S3_BUCKET,
        contentType: "application/json",
        resource: resourceString,
      });

      await enqueueMessage({
        deduplicationId: `${uploadResponse.bucketName}-${uploadResponse.remoteFilename}`,
        messageGroupId: resource.type,
        messageType: "realtime-message",
        payload: uploadResponse,
        queueRegion: AWS_IRIS_SQS_REGION,
        queueUrl: AWS_IRIS_SQS_URL,
      });
    } else {
      await enqueueMessage({
        messageGroupId: resource.type,
        messageType: "realtime-message",
        payload: resource,
        queueRegion: AWS_IRIS_SQS_REGION,
        queueUrl: AWS_IRIS_SQS_URL,
      });
    }
  } catch (err) {
    logServerError("Failed to send realtime message", err);
  }
}
