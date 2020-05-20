import AsyncEmitter from "promise-events";
import { CalaEvents } from "./";

let emitter: AsyncEmitter | null = null;

const getEmitter = (): AsyncEmitter => {
  if (!emitter) {
    emitter = new AsyncEmitter();
  }
  return emitter;
};

export async function emit<Event extends CalaEvents.EventBase>(
  type: Event["type"],
  domain: Event["domain"],
  event: Omit<Event, "type" | "domain">
): Promise<void> {
  const eventType = `${type}.${domain}`;
  await getEmitter().emit(eventType, {
    ...event,
    type,
    domain,
  });
}

export function listen<Event extends CalaEvents.EventBase>(
  type: Event["type"],
  domain: Event["domain"],
  handler: CalaEvents.Handler<Event>
): void {
  const eventType = `${type}.${domain}`;
  getEmitter().on(eventType, handler);
}
