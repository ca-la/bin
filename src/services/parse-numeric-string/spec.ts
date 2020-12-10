import { Test, test } from "../../test-helpers/simple";
import parseNumericString from ".";

test("parses PostgreSQL bigint numbers to JavaScript floats", (t: Test) => {
  t.equal(parseNumericString("0"), 0);
  t.equal(parseNumericString("1"), 1);
  t.equal(parseNumericString("-1234"), -1234);
  t.equal(parseNumericString("1234567890123"), 1234567890123);
});

test("rejects numbers outside JavaScript's safe range", (t: Test) => {
  t.throws(() => {
    parseNumericString("19007199254740991");
  }, "19007199254740991 is outside the safe Number range, cannot parse it");

  t.throws(() => {
    parseNumericString("-19007199254740991");
  }, "-19007199254740991 is outside the safe Number range, cannot parse it");
});

test("rejects invalid numbers", (t: Test) => {
  t.throws(() => {
    parseNumericString("undefined");
  }, '"undefined" is not a number, cannot parse it');

  t.throws(() => {
    parseNumericString("");
  }, '"" is not a number, cannot parse it');
});
