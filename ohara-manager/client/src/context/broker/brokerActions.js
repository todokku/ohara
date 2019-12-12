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

import { pick, map } from 'lodash';

import * as brokerApi from 'api/brokerApi';
import * as inspectApi from 'api/inspectApi';
import * as objectApi from 'api/objectApi';
import {
  fetchBrokersRoutine,
  updateStagingSettingsRoutine,
} from './brokerRoutines';

const fetchBrokersCreator = (
  state,
  dispatch,
  showMessage,
  routine = fetchBrokersRoutine,
) => async () => {
  if (state.isFetching || state.lastUpdated || state.error) return;

  dispatch(routine.request());
  const result = await brokerApi.getAll();

  if (result.errors) {
    dispatch(routine.failure(result.title));
    showMessage(result.title);
    return;
  }
  const brokers = result.data;

  const brokerInfos = await Promise.all(
    map(brokers, async broker => {
      const params = pick(broker.settings, ['name', 'group']);
      const result = await inspectApi.getBrokerInfo(params);
      const brokerInfo = result.errors ? {} : result.data;

      const result2 = await objectApi.get(params);
      const stagingSettings = result2.errors ? {} : result2.data;

      return {
        serviceType: 'broker',
        ...broker,
        ...brokerInfo,
        stagingSettings,
      };
    }),
  );

  dispatch(routine.success(brokerInfos));
};

const addBrokerCreator = () => async () => {
  // TODO: implement the logic for add broker
};
const updateBrokerCreator = () => async () => {
  // TODO: implement the logic for update broker
};
const deleteBrokerCreator = () => async () => {
  // TODO: implement the logic for delete broker
};

const updateStagingSettingsCreator = (
  state,
  dispatch,
  showMessage,
  routine = updateStagingSettingsRoutine,
) => async params => {
  if (state.isFetching) return;

  dispatch(routine.request());
  const result = await objectApi.update(params);

  if (result.errors) {
    dispatch(routine.failure(result.title));
    showMessage(result.title);
    return;
  }

  dispatch(routine.success(result.data));
};

export {
  fetchBrokersCreator,
  addBrokerCreator,
  updateBrokerCreator,
  deleteBrokerCreator,
  updateStagingSettingsCreator,
};
