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

import { has, isEmpty, map } from 'lodash';

import * as inspectApi from 'api/inspectApi';
import * as streamApi from 'api/streamApi';
import ContextApiError from 'context/ContextApiError';
import { generateClusterResponse, validate } from './utils';

const validateJarKey = values => {
  if (!has(values, 'jarKey'))
    throw new ContextApiError({
      title: 'The values must contain the jarKey property',
    });
};

export const createApi = context => {
  const { streamGroup, brokerKey, topicGroup } = context;
  if (!streamGroup || !brokerKey) return;

  const group = streamGroup;
  const brokerClusterKey = brokerKey;
  return {
    fetchAll: async () => {
      const params = { group };
      const res = await streamApi.getAll(params);
      if (res.errors) throw new ContextApiError(res);
      return await Promise.all(
        map(res.data, async stream => {
          const infoRes = await inspectApi.getStreamsInfo(stream);
          if (infoRes.errors) throw new ContextApiError(infoRes);
          return generateClusterResponse({
            values: stream,
            inspectInfo: infoRes.data,
          });
        }),
      );
    },
    fetch: async name => {
      const params = { name, group };
      const res = await streamApi.get(params);
      if (res.errors) throw new ContextApiError(res);
      const infoRes = await inspectApi.getStreamsInfo(params);
      if (infoRes.errors) throw new ContextApiError(infoRes);
      return generateClusterResponse({
        values: res.data,
        inspectInfo: infoRes.data,
      });
    },
    create: async values => {
      validate(values);
      validateJarKey(values);
      const params = {
        ...values,
        group,
        brokerClusterKey,
      };
      const res = await streamApi.create(params);
      if (res.errors) throw new ContextApiError(res);
      const infoRes = await inspectApi.getStreamsInfo(params);
      if (infoRes.errors) throw new ContextApiError(infoRes);
      return generateClusterResponse({
        values: res.data,
        inspectInfo: infoRes.data,
      });
    },
    update: async values => {
      validate(values);
      if (!isEmpty(values.to)) {
        values.to = values.to.map(to => {
          return {
            name: to.name,
            group: topicGroup,
          };
        });
      }
      if (!isEmpty(values.from)) {
        values.from = values.from.map(from => {
          return {
            name: from.name,
            group: topicGroup,
          };
        });
      }
      const params = { ...values, group };
      const res = await streamApi.update(params);
      if (res.errors) throw new ContextApiError(res);
      return generateClusterResponse({ values: res.data });
    },
    delete: async name => {
      const params = { name, group };
      const res = await streamApi.remove(params);
      if (res.errors) throw new ContextApiError(res);
      return params;
    },
    start: async name => {
      const params = { name, group };
      const res = await streamApi.start(params);
      if (res.errors) throw new ContextApiError(res);
      return generateClusterResponse({ values: res.data });
    },
    stop: async name => {
      const params = { name, group };
      const res = await streamApi.stop(params);
      if (res.errors) throw new ContextApiError(res);
      return generateClusterResponse({ values: res.data });
    },
  };
};
