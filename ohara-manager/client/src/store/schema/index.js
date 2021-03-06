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

import { schema } from 'normalizr';
import { getId } from 'utils/object';

export const ENTITY_TYPE = {
  pipelines: 'pipelines',
  workspaces: 'workspaces',
};

export const pipeline = new schema.Entity(ENTITY_TYPE.pipelines, undefined, {
  idAttribute: getId,
});

export const workspace = new schema.Entity(ENTITY_TYPE.workspaces, undefined, {
  idAttribute: getId,
});
