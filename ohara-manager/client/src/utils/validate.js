/*
 * Copyright 2019 is-land
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Return `undefined` means the test has passed!
export const required = value =>
  value ? undefined : 'This is a required field';

export const validServiceName = value => {
  return /[^0-9a-z]/g.test(value)
    ? 'You only can use lower case letters and numbers'
    : undefined;
};

export const minLength = min => value => {
  return value.length >= min
    ? undefined
    : `The value must be greater than ${min} characters long`;
};

export const maxLength = max => value => {
  return value.length <= max
    ? undefined
    : `The value must be less than ${max} characters long`;
};

export const minValue = min => value => {
  return value >= min ? undefined : `The value must be greater than ${min}`;
};

export const maxValue = max => value => {
  return value <= max ? undefined : `The value must be less than ${max}`;
};

export const lessThanTweenty = value =>
  value.length <= 20 ? undefined : 'Must be between 1 and 20 characters long';

export const composeValidators = (...validators) => value =>
  validators.reduce((error, validator) => error || validator(value), undefined);