'use strict';

const InvalidDataError = require('../../errors/invalid-data');

function exists(val) {
  return (
    val !== null &&
    val !== undefined &&
    String.prototype.trim.call(val) !== ''
  );
}

/**
 * Ensure that an object has a set of properties - otherwise, throw an error.
 * The error message here probably shouldn't be user-facing; more useful for
 * internal integrity checks etc. See `requirePropertiesFormatted` below.
 *
 * @example
 *   requireProperties({ foo: 'bar' }, 'foo', 'baz', 'qux')
 *   - will throw 'Missing required properties: baz, qux'
 */
function requireProperties(obj, ...props) {
  if (!obj) {
    throw new Error('No data provided');
  }

  const missingProps = [];

  props.forEach((prop) => {
    if (!exists(obj[prop])) {
      missingProps.push(prop);
    }
  });

  if (missingProps.length > 0) {
    throw new Error(`Missing required properties: ${missingProps.join(', ')}`);
  }
}

/**
 * @param {Object} data
 * @param {Object} messages Keys are field names, values are messages to throw
 * if said field is missing.
 * @example
 *   requireProperties(someUserData, {
 *     addressLine1: 'Address Line 1',
 *     city: 'City',
 *     region: 'Region'
 *   });
 */
function requirePropertiesFormatted(data, messages) {
  if (!data) {
    throw new InvalidDataError('Missing required information');
  }

  Object.keys(messages).forEach((key) => {
    if (!exists(data[key])) {
      throw new InvalidDataError(`Missing required information: ${messages[key]}`);
    }
  });
}

module.exports = {
  requireProperties,
  requirePropertiesFormatted
};
