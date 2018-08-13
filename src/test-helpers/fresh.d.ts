import * as tape from 'tape';
import * as sinon from 'sinon';

export type Test = tape.Test;

export function sandbox(): sinon.SinonSandbox;
export function test(name: string, cb: tape.TestCase): void;
