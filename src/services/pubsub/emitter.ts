import AsyncEmitter from "promise-events";
import { CalaEvents } from "./";

let emitter: AsyncEmitter | null = null;

const getEmitter = (): AsyncEmitter => {
  if (!emitter) {
    emitter = new AsyncEmitter();
  }
  return emitter;
};

export async function emit<
  Model,
  Event extends CalaEvents.Event<Model, string>
>(event: Event): Promise<void> {
  const eventType = `${event.type}.${event.domain}`;
  await getEmitter().emit(eventType, event);
}

export function listen<Model, Event extends CalaEvents.Event<Model, string>>(
  type: Event["type"],
  domain: Event["domain"],
  handler: CalaEvents.Handler<Model, Event["domain"], Event>
): void {
  const eventType = `${type}.${domain}`;
  getEmitter().on(eventType, handler);
}
