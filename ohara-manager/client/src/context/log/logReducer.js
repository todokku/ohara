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

import * as routine from './logRoutines';
import { TIME_GROUP } from './const';

const initialState = {
  isFetching: false,
  query: {
    logType: '',
    hostName: '',
    streamName: '',
    timeGroup: TIME_GROUP.latest,
    timeRange: 10,
    startTime: '',
    endTime: '',
  },
  data: {},
  lastUpdated: null,
  error: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case routine.initializeRoutine.TRIGGER:
      return initialState;
    case routine.refetchLogRoutine.TRIGGER:
      return {
        ...state,
        lastUpdated: null,
      };
    case routine.setLogTypeRoutine.REQUEST:
    case routine.setHostNameRoutine.REQUEST:
    case routine.setStreamNameRoutine.REQUEST:
    case routine.setTimeGroupRoutine.REQUEST:
    case routine.setTimeRangeRoutine.REQUEST:
    case routine.setStartTimeRoutine.REQUEST:
    case routine.setEndTimeRoutine.REQUEST:
      return {
        ...state,
        query: Object.assign({}, state.query, action.payload),
      };
    case routine.fetchConfiguratorRoutine.REQUEST:
    case routine.fetchZookeeperRoutine.REQUEST:
    case routine.fetchBrokerRoutine.REQUEST:
    case routine.fetchWorkerRoutine.REQUEST:
    case routine.fetchStreamRoutine.REQUEST:
      return {
        ...state,
        isFetching: true,
      };
    case routine.fetchConfiguratorRoutine.SUCCESS:
    case routine.fetchZookeeperRoutine.SUCCESS:
    case routine.fetchBrokerRoutine.SUCCESS:
    case routine.fetchWorkerRoutine.SUCCESS:
    case routine.fetchStreamRoutine.SUCCESS:
      return {
        ...state,
        isFetching: false,
        lastUpdated: new Date(),
        data: action.payload,
      };
    case routine.fetchConfiguratorRoutine.FAILURE:
    case routine.fetchZookeeperRoutine.FAILURE:
    case routine.fetchBrokerRoutine.FAILURE:
    case routine.fetchWorkerRoutine.FAILURE:
    case routine.fetchStreamRoutine.FAILURE:
      return {
        ...state,
        isFetching: false,
        lastUpdated: new Date(),
        error: action.payload,
      };

    default:
      return state;
  }
};

export { reducer, initialState };
