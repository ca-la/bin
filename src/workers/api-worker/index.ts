import { log } from "../../services/logger";
import { messageHandler } from "./message-handler";
import { configureAWS } from "./aws";
import { processMessagesLoop } from "./process-messages";

async function start(): Promise<void> {
  await import("./initialize-listeners");
  configureAWS();
  processMessagesLoop(messageHandler());
}

log("Starting api-worker server");
start();
