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

package oharastream.ohara.shabondi.sink

import java.time.{Duration => JDuration}
import java.util.concurrent._

import com.google.common.util.concurrent.ThreadFactoryBuilder
import oharastream.ohara.common.util.Releasable
import com.typesafe.scalalogging.Logger

import scala.collection.JavaConverters._

private[sink] object SinkDataGroups {
  def apply(config: SinkConfig) =
    new SinkDataGroups(config.brokers, config.sinkFromTopics.map(_.topicNameOnKafka), config.sinkPollTimeout)
}

private class SinkDataGroups(brokerProps: String, topicNames: Seq[String], pollTimeout: JDuration) extends Releasable {
  private val threadPool: ExecutorService =
    Executors.newCachedThreadPool(new ThreadFactoryBuilder().setNameFormat("SinkDataGroups-%d").build())

  private val log                    = Logger(classOf[SinkDataGroups])
  private[sink] val defaultGroupName = "__dafault__"
  private val dataGroups             = new ConcurrentHashMap[String, DataGroup]()

  def defaultGroup: DataGroup = createIfAbsent(defaultGroupName)

  def removeGroup(name: String): Boolean = {
    val group = dataGroups.remove(name)
    if (group != null) {
      group.close()
      true
    } else
      false
  }

  def groupExist(name: String): Boolean =
    dataGroups.containsKey(name)

  def createIfAbsent(name: String): DataGroup =
    dataGroups.computeIfAbsent(
      name, { n =>
        log.info("create data group: {}", n)
        val dataGroup = new DataGroup(n, brokerProps, topicNames, pollTimeout)
        threadPool.submit(dataGroup.producer)
        dataGroup
      }
    )

  def size: Int = dataGroups.size()

  def freeIdleGroup(idleTime: JDuration): Unit = {
    val groups = dataGroups.elements().asScala.toSeq
    groups.foreach { group =>
      if (group.isIdle(idleTime)) {
        removeGroup(group.name)
      }
    }
  }

  override def close(): Unit = {
    dataGroups.asScala.foreach {
      case (_, dataGroup) =>
        dataGroup.close()
    }
    threadPool.shutdown()
  }
}
