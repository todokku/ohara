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

import { fetchLogs } from '../logApi';
import { handleError, axiosInstance } from 'utils/apiUtils';

jest.mock('utils/apiUtils');

const url = '/api/logs';

describe('fetchLogs()', () => {
  afterEach(jest.clearAllMocks);
  const serviceName = 'a';
  const clusterName = 'b';

  it('handles success http call', async () => {
    const res = {
      data: {
        isSuccess: true,
      },
    };

    axiosInstance.get.mockImplementation(() => Promise.resolve(res));

    const result = await fetchLogs(serviceName, clusterName);
    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    // TODO: cluster=xx is deprecated. Use ${url}/${serviceName}/clusterName replace ... by chia
    expect(axiosInstance.get).toHaveBeenCalledWith(
      `${url}/${serviceName}?cluster=${clusterName}`,
    );
    expect(result).toBe(res);
  });

  it('handles success http call but with server error', async () => {
    const res = {
      data: {
        isSuccess: false,
      },
    };
    axiosInstance.get.mockImplementation(() => Promise.resolve(res));

    const result = await fetchLogs(serviceName, clusterName);

    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
// TODO: cluster=xx is deprecated. Use ${url}/${serviceName}/clusterName replace ... by chia
    expect(axiosInstance.get).toHaveBeenCalledWith(
      `${url}/${serviceName}?cluster=${clusterName}`,
    );
    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith(result);
  });

  it('handles failed http call', async () => {
    const res = {
      data: {
        errorMessage: {
          message: 'error!',
        },
      },
    };

    axiosInstance.get.mockImplementation(() => Promise.reject(res));

    await fetchLogs(serviceName, clusterName);
    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith(res);
  });
});