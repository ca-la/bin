import tape from "tape";
import sinon from "sinon";

type Function0 = () => void;

export type Test = tape.Test;

export function sandbox(): sinon.SinonSandbox;
export function test(
  name: string,
  cb: tape.TestCase,
  setup?: Function0,
  teardown?: Function0
): void;
