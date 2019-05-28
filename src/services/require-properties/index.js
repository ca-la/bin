'use strict';

const Logger = require('../../services/logger');

function isEmptyString(val) {
  return typeof val === 'string' && val.trim() === '';
}

function exists(val) {
  return val !== null && val !== undefined && !isEmptyString(val);
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
    Logger.logServerError('Object: ', obj);
    throw new Error('requireProperties was called on a falsy object');
  }

  const missingProps = [];

  props.forEach(prop => {
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
    throw new Error('Missing required information');
  }

  Object.keys(messages).forEach(key => {
    if (!exists(data[key])) {
      throw new Error(`Missing required information: ${messages[key]}`);
    }
  });
}

/**
 * @param {Object} data
 *   Keys will be used as error messages for missing values
 *   e.g.
 *    requireValues({ a: undefined, b: 2 }) // throws 'Missing a'
 */
function requireValues(data) {
  return requireProperties(data, ...Object.keys(data));
}

function assert(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

/**
 * A predicate function to check if an object's key-set is a subset of the
 * passed set of properties
 *
 * @example
 *   hasSomeProperties({ foo: 'bar' }, 'foo', 'baz', 'qux')
 *   - will return true
 *   hasProperties({ foo: 'bar' }, 'foo')
 *   - will return true
 *   hasProperties({ foo: 'bar', baz: 'qux' }, 'foo')
 *   - will return false
 */
function hasSomeProperties(data, ...props) {
  return Object.keys(data).every(key => props.includes(key));
}

/**
 * A predicate function to check if a object's key-set is a superset of the
 * passed set of properties
 *
 * @example
 *   hasProperties({ foo: 'bar' }, 'foo', 'baz', 'qux')
 *   - will return false
 *   hasProperties({ foo: 'bar' }, 'foo')
 *   - will return true
 *   hasProperties({ foo: 'bar', baz: 'qux' }, 'foo')
 *   - will return true
 */
function hasProperties(data, ...props) {
  return props.every(prop => data[prop] !== undefined);
}

/**
 * A predicate function to check if a object's key-set is an equal set of the
 * passed set of properties
 *
 * @example
 *   hasOnlyProperties({ foo: 'bar' }, 'foo', 'baz', 'qux')
 *   - will return false
 *   hasOnlyProperties({ foo: 'bar' }, 'foo')
 *   - will return true
 *   hasOnlyProperties({ foo: 'bar', baz: 'qux' }, 'foo')
 *   - will return false
 */
function hasOnlyProperties(data, ...props) {
  return (
    Object.keys(data).length === props.length && hasProperties(data, ...props)
  );
}

module.exports = {
  assert,
  requireProperties,
  requirePropertiesFormatted,
  requireValues,
  hasSomeProperties,
  hasProperties,
  hasOnlyProperties
};
