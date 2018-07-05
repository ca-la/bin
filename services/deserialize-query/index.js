'use strict';

const { reduce } = require('lodash');

/**
 * Query string parameter values are always parsed as strings. This function
 * will allow for deserializing the values with an arbitrary function, checking
 * that the values match an arbitrary predicate test, and then merging the
 * deserialized value into the defaults.
 *
 * @example
 * deserializeQuery(
 *   { foo: 12, baz: [], qux: null },                                   // defaults
 *   { foo: Number, bar: DateTime.fromJSDate, baz: a = a.map(Number) }, // serialize
 *   {                                                                  // check
 *     foo: n => !Number.isNaN(n) && !(n % 2),
 *     bar: dt => dt.isValid(),
 *     baz: a => a.every(Number.isInteger)
 *   },
 *   { foo: '8', bar: new Date(), baz: ['0', '1', '2', '0.1'] }         // input
 * );
 * // => { foo: 8, bar: DateTime(now), baz: [], qux: null }
 *
 * @param {Object<String, any>} defaults `key` -> default value mapping
 * @param {Object<String, Function>} serialize `key` -> `serializer function` mapping
 * @param {Object<String, Function>} check `key` -> `predicate` mapping.
 * @param {Object} input Input object that will be deserialized
 * @returns {Object} The deserialized object
 */
module.exports = function deserializeQuery(
  defaults,
  serialize,
  check,
  input
) {
  return reduce(input, (memo, prop, key) => {
    const serializer = serialize[key];
    let transformed = prop;

    if (typeof serializer === 'function') {
      const checker = check[key];
      const candidate = serializer(prop);

      if (typeof checker === 'function') {
        transformed = checker(candidate) ? candidate : defaults[key];
      } else {
        transformed = candidate;
      }
    }

    return Object.assign(memo, { [key]: transformed });
  }, defaults);
};
