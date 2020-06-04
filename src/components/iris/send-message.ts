import { RealtimeMessage } from "@cala/ts-lib";
import { uploadToS3 } from "../../services/aws/s3";
import { enqueueMessage } from "../../services/aws/sqs";
import {
  AWS_IRIS_S3_BUCKET,
  AWS_IRIS_SQS_REGION,
  AWS_IRIS_SQS_URL,
} from "../../config";
import { RealtimeDesignEventCreated } from "../design-events/realtime";

type AllRealtimeMessage = RealtimeMessage | RealtimeDesignEventCreated;

function getResourceId(resource: AllRealtimeMessage): string {
  switch (resource.type) {
    case "design-nodes/update": {
      return resource.designId;
    }
    default: {
      return resource.resource.id;
    }
  }
}

/**
 * Uploads a realtime resource to s3 then enqueues into SQS.
 * @param resource A realtime resource
 */
export async function sendMessage(resource: AllRealtimeMessage): Promise<void> {
  const uploadResponse = await uploadToS3({
    acl: "authenticated-read",
    bucketName: AWS_IRIS_S3_BUCKET,
    contentType: "application/json",
    resource: JSON.stringify(resource),
  });

  await enqueueMessage({
    deduplicationId: `${resource.type}-${getResourceId(resource)}`,
    messageGroupId: resource.type,
    messageType: "realtime-message",
    payload: uploadResponse,
    queueRegion: AWS_IRIS_SQS_REGION,
    queueUrl: AWS_IRIS_SQS_URL,
  });
}
