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

package com.island.ohara.configurator.route

import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.server
import akka.http.scaladsl.server.Directives._
import com.island.ohara.agent.ServiceCollie
import com.island.ohara.client.configurator.v0.BrokerApi._
import com.island.ohara.client.configurator.v0.ContainerApi.ContainerInfo
import com.island.ohara.client.configurator.v0.LogApi._
import com.island.ohara.client.configurator.v0.StreamApi._
import com.island.ohara.client.configurator.v0.WorkerApi._
import com.island.ohara.client.configurator.v0.ZookeeperApi._
import com.island.ohara.common.setting.ObjectKey

import scala.concurrent.{ExecutionContext, Future}

/**
  * Used to take log from specified cluster. We haven't log infra to provide UI to get log from specified "connector".
  * However, users need to "see" what happen on failed connectors. We don't implement the LogApi (client library) since
  * this is just a workaround.
  */
object LogRoute {

  private[this] def route(clusterKey: ObjectKey, data: Future[Map[ContainerInfo, String]])(
    implicit executionContext: ExecutionContext): server.Route =
    complete(data.map { d =>
      if (d.isEmpty)
        ClusterLog(
          clusterKey = clusterKey,
          logs = Seq(
            NodeLog(
              hostname = "N/A",
              value = "Please buy some machines to build the services :)"
            ))
        )
      else
        ClusterLog(
          clusterKey = clusterKey,
          logs = d.map {
            case (container, log) => NodeLog(container.nodeName, log)
          }.toSeq
        )
    })

  def apply(implicit collie: ServiceCollie, executionContext: ExecutionContext): server.Route =
    pathPrefix(LOG_PREFIX_PATH / Segment / Segment) {
      case (clusterPrefix, clusterName) =>
        parameter(GROUP_KEY ?) { groupOption =>
          val clusterKey =
            ObjectKey.of(groupOption.getOrElse(com.island.ohara.client.configurator.v0.GROUP_DEFAULT), clusterName)
          clusterPrefix match {
            case ZOOKEEPER_PREFIX_PATH =>
              route(clusterKey, collie.zookeeperCollie.logs(clusterKey))
            case BROKER_PREFIX_PATH =>
              route(clusterKey, collie.brokerCollie.logs(clusterKey))
            case WORKER_PREFIX_PATH =>
              route(clusterKey, collie.workerCollie.logs(clusterKey))
            case STREAMS_PREFIX_PATH =>
              route(clusterKey, collie.streamCollie.logs(clusterKey))
          }
        }
    }
}
