import AsyncEmitter from 'promise-events';
import { CalaEvents } from './';

let emitter: AsyncEmitter | null = null;

const getEmitter = (): AsyncEmitter => {
  if (!emitter) {
    emitter = new AsyncEmitter();
  }
  return emitter;
};

export async function emit<T extends CalaEvents.Event>(
  eventType: T['type'],
  event: Omit<T, 'type'>
): Promise<void> {
  await getEmitter().emit(eventType, {
    ...event,
    type: eventType
  });
}

export function listen<T extends CalaEvents.Event>(
  eventType: T['type'],
  handler: CalaEvents.Handler<T>
): void {
  getEmitter().on(eventType, handler);
}
