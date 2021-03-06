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

import { createRoutine } from 'redux-routines';

const fetchStreamsRoutine = createRoutine('FETCH_STREAMS');
const createStreamRoutine = createRoutine('CREATE_STREAM');
const updateStreamRoutine = createRoutine('UPDATE_STREAM');
const deleteStreamRoutine = createRoutine('DELETE_STREAM');
const startStreamRoutine = createRoutine('START_STREAM');
const stopStreamRoutine = createRoutine('STOP_STREAM');
const initializeRoutine = createRoutine('INITIALIZE');

export {
  initializeRoutine,
  fetchStreamsRoutine,
  createStreamRoutine,
  updateStreamRoutine,
  deleteStreamRoutine,
  startStreamRoutine,
  stopStreamRoutine,
};
