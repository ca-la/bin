import AsyncEmitter from 'promise-events';
import { CalaEvents } from './';

const emitter = new AsyncEmitter();

export async function emit<T extends CalaEvents.Event>(
  eventType: T['type'],
  event: Omit<T, 'type'>
): Promise<void> {
  await emitter.emit(eventType, {
    ...event,
    type: eventType
  });
}

export function listen<T extends CalaEvents.Event>(
  eventType: T['type'],
  handler: CalaEvents.Handler<T>
): void {
  emitter.on(eventType, handler);
}
