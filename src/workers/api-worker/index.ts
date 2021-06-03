import { log } from "../../services/logger";
import { messageHandler } from "./message-handler";
import { configureAWS } from "./aws";
import { processMessagesLoop } from "./process-messages";

function start(): void {
  configureAWS();
  processMessagesLoop(messageHandler());
}

log("Starting api-worker server");
start();
