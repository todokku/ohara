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

import toastr from 'toastr';
import { handleError } from '../apiUtils';

describe('handleError()', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls toastr.error() with the given error message', () => {
    const err = 'error';

    handleError(err);
    expect(toastr.error).toHaveBeenCalledTimes(1);
    expect(toastr.error).toHaveBeenCalledWith(err);
  });

  it('calls toastr.error() with the given error object', () => {
    const err = {
      data: {
        errorMessage: { message: 'error' },
      },
    };

    handleError(err);
    expect(toastr.error).toHaveBeenCalledTimes(1);
    expect(toastr.error).toHaveBeenCalledWith('error');
  });
});