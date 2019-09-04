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

import akka.http.scaladsl.server
import com.island.ohara.agent.{ClusterCollie, NodeCollie, ZookeeperCollie}
import com.island.ohara.client.configurator.v0.ZookeeperApi._
import com.island.ohara.common.setting.ObjectKey
import com.island.ohara.common.util.CommonUtils
import com.island.ohara.configurator.route.hook.{HookOfAction, HookOfCreation, HookOfGroup, HookOfUpdate}
import com.island.ohara.configurator.store.{DataStore, MeterCache}

import scala.concurrent.{ExecutionContext, Future}

object ZookeeperRoute {

  private[this] def hookOfCreation: HookOfCreation[Creation, ZookeeperClusterInfo] = (creation: Creation) =>
    Future.successful(
      ZookeeperClusterInfo(
        settings = creation.settings,
        nodeNames = creation.nodeNames,
        deadNodes = Set.empty,
        state = None,
        error = None,
        lastModified = CommonUtils.current()
      ))

  private[this] def hookOfUpdate(
    implicit clusterCollie: ClusterCollie,
    executionContext: ExecutionContext): HookOfUpdate[Creation, Update, ZookeeperClusterInfo] =
    (key: ObjectKey, update: Update, previousOption: Option[ZookeeperClusterInfo]) =>
      clusterCollie.zookeeperCollie.clusters().map { clusters =>
        if (clusters.keys.filter(_.name == key.name()).exists(_.state.nonEmpty))
          throw new RuntimeException(s"You cannot update property on non-stopped zookeeper cluster: $key")
        else
          // use PUT as creation request
          ZookeeperClusterInfo(
            settings = previousOption.map(_.settings).getOrElse(Map.empty) ++ update.settings,
            nodeNames = update.nodeNames.orElse(previousOption.map(_.nodeNames)).getOrElse(Set.empty),
            // this cluster is not running so we don't need to keep the dead nodes in the updated cluster.
            deadNodes = Set.empty,
            state = None,
            error = None,
            lastModified = CommonUtils.current()
          )
    }

  private[this] def hookOfStart(implicit store: DataStore,
                                clusterCollie: ClusterCollie,
                                executionContext: ExecutionContext): HookOfAction =
    (key: ObjectKey, _: String, _: Map[String, String]) =>
      store
        .value[ZookeeperClusterInfo](key)
        .flatMap(
          zkClusterInfo =>
            clusterCollie.zookeeperCollie.creator
              .clusterName(zkClusterInfo.name)
              .clientPort(zkClusterInfo.clientPort)
              .electionPort(zkClusterInfo.electionPort)
              .peerPort(zkClusterInfo.peerPort)
              .imageName(zkClusterInfo.imageName)
              .nodeNames(zkClusterInfo.nodeNames)
              .threadPool(executionContext)
              .create())
        .map(_ => Unit)

  private[this] def hookBeforeStop(
    implicit store: DataStore,
    clusterCollie: ClusterCollie,
    executionContext: ExecutionContext): HookOfAction = (key: ObjectKey, _: String, _: Map[String, String]) =>
    store
      .value[ZookeeperClusterInfo](key)
      .flatMap(
        zkClusterInfo =>
          clusterCollie.brokerCollie
            .clusters()
            .map(
              _.keys
                .find(_.zookeeperClusterName == zkClusterInfo.name)
                .map(cluster =>
                  throw new IllegalArgumentException(
                    s"you can't remove zookeeper cluster:${zkClusterInfo.name} since it is used by broker cluster:${cluster.name}"))
          ))

  private[this] def hookOfGroup: HookOfGroup = _ => GROUP_DEFAULT

  def apply(implicit store: DataStore,
            meterCache: MeterCache,
            zookeeperCollie: ZookeeperCollie,
            clusterCollie: ClusterCollie,
            nodeCollie: NodeCollie,
            executionContext: ExecutionContext): server.Route =
    clusterRoute(
      root = ZOOKEEPER_PREFIX_PATH,
      metricsKey = None,
      hookOfGroup = hookOfGroup,
      hookOfCreation = hookOfCreation,
      hookOfUpdate = hookOfUpdate,
      hookOfStart = hookOfStart,
      hookBeforeStop = hookBeforeStop
    )
}
