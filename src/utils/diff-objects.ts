const isEqual = require("lodash.isequal");

export interface ComparableObject {
  [key: string]: any;
}

export interface DiffResult {
  added: string[];
  changed: string[];
  deleted: string[];
}

/**
 * Calculate the difference between `obj1` and `obj2` and return a 3 key object as result.
 * `added`: keys that are only in `obj2` but not in `obj1`
 * `deleted`: keys that are only in `obj1` but not in `obj2`
 * `changed`: keys that are present on both `obj1` and `obj2` but their values are different
 */
export function diffObjects(
  obj1: ComparableObject,
  obj2: ComparableObject
): DiffResult {
  const result: DiffResult = {
    added: [],
    changed: [],
    deleted: []
  };
  if (
    typeof obj1 !== "object" ||
    obj1 === null ||
    typeof obj2 !== "object" ||
    obj2 === null
  ) {
    return result;
  }

  if (obj1 === obj2) return result;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  keys1.forEach(key => {
    if (keys2.indexOf(key) === -1) {
      result.deleted.push(key);
    } else {
      // `key` exists in both objects, but are they equal?
      if (!isEqual(obj1[key], obj2[key])) {
        result.changed.push(key);
      }
    }
  });
  keys2.forEach(key => {
    if (keys1.indexOf(key) === -1) {
      result.added.push(key);
    }
  });

  return result;
}
