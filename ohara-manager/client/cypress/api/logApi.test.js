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

/* eslint-disable no-unused-expressions */
// eslint is complaining about `expect(thing).to.be.undefined`

import * as generate from '../../src/utils/generate';
import * as logApi from '../../src/api/logApi';
import * as topicApi from '../../src/api/topicApi';
import * as streamApi from '../../src/api/streamApi';
import * as fileApi from '../../src/api/fileApi';
import { createServices, deleteAllServices } from '../utils';

const file = {
  fixturePath: 'stream',
  // we use an existing file to simulate upload jar
  name: 'ohara-it-stream.jar',
  group: generate.serviceName({ prefix: 'group' }),
};

const generateCluster = async () => {
  const result = await createServices({
    withWorker: true,
    withBroker: true,
    withZookeeper: true,
    withNode: true,
  });
  return result;
};

describe('Log API', () => {
  beforeEach(async () => {
    await deleteAllServices();
    cy.createJar(file).then(params => fileApi.create(params));
  });

  it('fetchConfiguratorLog', async () => {
    const result = await logApi.getConfiguratorLog();
    expect(result.errors).to.be.undefined;

    const { clusterKey, logs } = result.data;

    expect(clusterKey).to.be.an('object');

    expect(logs).to.be.an('array');
  });

  it('fetchServiceLog', async () => {
    const { node, zookeeper, broker, worker } = await generateCluster();

    const logZookeeper = await logApi.getZookeeperLog(zookeeper);
    expect(logZookeeper.errors).to.be.undefined;

    expect(logZookeeper.data.clusterKey.name).to.be.eq(zookeeper.name);
    expect(logZookeeper.data.clusterKey.group).to.be.eq(zookeeper.group);
    expect(logZookeeper.data.logs).to.be.an('array');

    const logBroker = await logApi.getBrokerLog(broker);
    expect(logBroker.errors).to.be.undefined;

    expect(logBroker.data.clusterKey.name).to.be.eq(broker.name);
    expect(logBroker.data.clusterKey.group).to.be.eq(broker.group);
    expect(logBroker.data.logs).to.be.an('array');

    const logWorker = await logApi.getWorkerLog(worker);
    expect(logWorker.errors).to.be.undefined;

    expect(logWorker.data.clusterKey.name).to.be.eq(worker.name);
    expect(logWorker.data.clusterKey.group).to.be.eq(worker.group);
    expect(logWorker.data.logs).to.be.an('array');

    const topic = {
      name: generate.serviceName({ prefix: 'topic' }),
      group: generate.serviceName({ prefix: 'group' }),
      nodeNames: [node.hostname],
      brokerClusterKey: {
        name: broker.name,
        group: broker.group,
      },
    };
    await topicApi.create(topic);
    await topicApi.start(topic);

    const stream = {
      name: generate.serviceName({ prefix: 'stream' }),
      group: generate.serviceName({ prefix: 'group' }),
      nodeNames: [node.hostname],
      brokerClusterKey: {
        name: broker.name,
        group: broker.group,
      },
      jarKey: {
        name: file.name,
        group: file.group,
      },
      from: [{ name: topic.name, group: topic.group }],
      to: [{ name: topic.name, group: topic.group }],
    };
    await streamApi.create(stream);
    await streamApi.start(stream);

    const logStream = await logApi.getStreamLog(stream);
    expect(logStream.errors).to.be.undefined;

    expect(logStream.data.clusterKey.name).to.be.eq(stream.name);
    expect(logStream.data.clusterKey.group).to.be.eq(stream.group);
    expect(logStream.data.logs).to.be.an('array');
  });
});
