import { Task, ApiMessages } from "./types";
import { SQSMessage } from "./aws";

export type MessageHandler = (message: SQSMessage) => Promise<any>;

/**
 * Curried function that takes a message and fires the correct api call.
 */
export function messageHandler(): MessageHandler {
  return async (message: SQSMessage): Promise<any> => {
    if (!message.Body) {
      throw new Error("No Message Body Found!");
    }
    const task: Task<keyof ApiMessages> = JSON.parse(message.Body);

    switch (task.type) {
      default: {
        throw new Error(`Message type not supported! ${task.type}`);
      }
    }
  };
}
