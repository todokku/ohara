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

package oharastream.ohara.shabondi

import java.util
import java.util.concurrent.{ExecutorService, Executors}

import com.google.common.util.concurrent.ThreadFactoryBuilder
import oharastream.ohara.common.data.Row
import oharastream.ohara.common.setting.TopicKey
import oharastream.ohara.common.util.{CommonUtils, Releasable}
import oharastream.ohara.kafka.TopicAdmin
import oharastream.ohara.testing.WithBroker
import oharastream.ohara.shabondi.common.ShabondiUtils
import oharastream.ohara.shabondi.sink.SinkConfig
import oharastream.ohara.shabondi.source.SourceConfig
import com.typesafe.scalalogging.Logger
import org.junit.After
import org.scalatest.Matchers

import scala.collection.JavaConverters._
import scala.collection.{immutable, mutable}
import scala.concurrent.{ExecutionContext, Future}

abstract class BasicShabondiTest extends WithBroker with Matchers {
  protected val log = Logger(this.getClass())

  protected val brokerProps            = testUtil.brokersConnProps
  protected val topicAdmin: TopicAdmin = TopicAdmin.of(brokerProps)

  protected val newThreadPool: () => ExecutorService = () =>
    Executors.newCachedThreadPool(new ThreadFactoryBuilder().setNameFormat(this.getClass.getSimpleName + "-").build())

  protected val countRows: (util.Queue[Row], Long, ExecutionContext) => Future[Long] =
    (queue, executionTime, ec) =>
      Future {
        log.debug("countRows begin...")
        val baseTime = System.currentTimeMillis()
        var count    = 0L
        var running  = true
        while (running) {
          val row = queue.poll()
          if (row != null) count += 1 else Thread.sleep(100)
          running = (System.currentTimeMillis() - baseTime) < executionTime
        }
        log.debug("countRows done")
        count
      }(ec)

  protected def createTopicKey = TopicKey.of("default", CommonUtils.randomString(5))

  protected def createTestTopic(topicKey: TopicKey): Unit =
    createTestTopic(topicKey.name)

  protected def createTestTopic(name: String): Unit =
    topicAdmin.topicCreator
      .numberOfPartitions(1)
      .numberOfReplications(1.toShort)
      .topicName(name)
      .create

  protected def defaultSourceConfig(
    sourceToTopics: Seq[TopicKey] = Seq.empty[TopicKey]
  ): SourceConfig = {
    import ShabondiDefinitions._
    val serverClassName = oharastream.ohara.shabondi.source.Boot.getClass.getName.replaceAll("\\$", "")
    val args = mutable.ArrayBuffer(
      SERVER_CLASS_DEFINITION.key + "=" + serverClassName,
      CLIENT_PORT_DEFINITION.key + "=8080",
      BROKERS_DEFINITION.key + "=" + testUtil.brokersConnProps
    )
    if (sourceToTopics.nonEmpty)
      args += s"${SOURCE_TO_TOPICS_DEFINITION.key}=${TopicKey.toJsonString(sourceToTopics.asJava)}"

    val rawConfig = ShabondiUtils.parseArgs(args.toArray)
    new SourceConfig(rawConfig)
  }

  protected def defaultSinkConfig(
    sinkFromTopics: Seq[TopicKey] = Seq.empty[TopicKey]
  ): SinkConfig = {
    import ShabondiDefinitions._
    val serverClassName = oharastream.ohara.shabondi.sink.Boot.getClass.getName.replaceAll("\\$", "")
    val args = mutable.ArrayBuffer(
      SERVER_CLASS_DEFINITION.key + "=" + serverClassName,
      CLIENT_PORT_DEFINITION.key + "=8080",
      BROKERS_DEFINITION.key + "=" + testUtil.brokersConnProps
    )
    if (sinkFromTopics.nonEmpty)
      args += s"${SINK_FROM_TOPICS_DEFINITION.key}=${TopicKey.toJsonString(sinkFromTopics.asJava)}"
    val rawConfig = ShabondiUtils.parseArgs(args.toArray)
    new SinkConfig(rawConfig)
  }

  protected def singleRow(columnSize: Int, rowId: Int = 0): Row =
    KafkaSupport.singleRow(columnSize, rowId)

  protected def multipleRows(rowSize: Int): immutable.Iterable[Row] =
    KafkaSupport.multipleRows(rowSize)

  @After
  def tearDown(): Unit = {
    Releasable.close(topicAdmin)
  }
}
