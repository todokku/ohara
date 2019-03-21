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

package com.island.ohara.client.kafka

import java.util.Collections

import com.island.ohara.common.data.{ConnectorState, Row, Serializer}
import com.island.ohara.common.util.CommonUtils
import com.island.ohara.kafka.Consumer
import com.island.ohara.kafka.connector.json.{ConnectorFormatter, StringList}
import com.island.ohara.testing.With3Brokers3Workers
import org.junit.Test
import org.scalatest.Matchers

import scala.collection.JavaConverters._
import scala.concurrent.ExecutionContext.Implicits.global
class TestWorkerClient extends With3Brokers3Workers with Matchers {

  private[this] val workerClient = WorkerClient(testUtil().workersConnProps())
  @Test
  def testExist(): Unit = {
    val topicName = CommonUtils.randomString(10)
    val connectorName = CommonUtils.randomString(10)
    result(workerClient.exist(connectorName)) shouldBe false

    result(
      workerClient
        .connectorCreator()
        .topicName(topicName)
        .connectorClass(classOf[MyConnector])
        .name(connectorName)
        .numberOfTasks(1)
        .create)

    try assertExist(workerClient, connectorName)
    finally result(workerClient.delete(connectorName))
  }

  @Test
  def testExistOnUnrunnableConnector(): Unit = {
    val topicName = CommonUtils.randomString(10)
    val connectorName = CommonUtils.randomString(10)
    result(workerClient.exist(connectorName)) shouldBe false

    result(
      workerClient
        .connectorCreator()
        .topicName(topicName)
        .connectorClass(classOf[BrokenConnector])
        .name(connectorName)
        .numberOfTasks(1)
        .create)

    try assertExist(workerClient, connectorName)
    finally result(workerClient.delete(connectorName))
  }

  @Test
  def testPauseAndResumeSource(): Unit = {
    val topicName = CommonUtils.randomString(10)
    val connectorName = CommonUtils.randomString(10)
    result(
      workerClient
        .connectorCreator()
        .topicName(topicName)
        .connectorClass(classOf[MyConnector])
        .name(connectorName)
        .numberOfTasks(1)
        .create)
    try {
      assertExist(workerClient, connectorName)
      val consumer =
        Consumer
          .builder[Row, Array[Byte]]()
          .topicName(topicName)
          .offsetFromBegin()
          .connectionProps(testUtil.brokersConnProps)
          .keySerializer(Serializer.ROW)
          .valueSerializer(Serializer.BYTES)
          .build()
      try {
        // try to receive some data from topic
        var rows = consumer.poll(java.time.Duration.ofSeconds(10), 1)
        rows.size should not be 0
        rows.asScala.foreach(_.key.get shouldBe ROW)
        // pause connector
        result(workerClient.pause(connectorName))

        await(() => result(workerClient.status(connectorName)).connector.state == ConnectorState.PAUSED)

        // try to receive all data from topic...10 seconds should be enough in this case
        rows = consumer.poll(java.time.Duration.ofSeconds(10), Int.MaxValue)
        rows.asScala.foreach(_.key.get shouldBe ROW)

        // connector is paused so there is no data
        rows = consumer.poll(java.time.Duration.ofSeconds(20), 1)
        rows.size shouldBe 0

        // resume connector
        result(workerClient.resume(connectorName))

        await(() => result(workerClient.status(connectorName)).connector.state == ConnectorState.RUNNING)

        // since connector is resumed so some data are generated
        rows = consumer.poll(java.time.Duration.ofSeconds(20), 1)
        rows.size should not be 0
      } finally consumer.close()
    } finally result(workerClient.delete(connectorName))
  }

  @Test
  def testValidate(): Unit = {
    val name = CommonUtils.randomString(10)
    val topicName = CommonUtils.randomString(10)
    val numberOfTasks = 1
    val settingInfo = result(
      workerClient
        .connectorValidator()
        .className(classOf[MyConnector].getName)
        .settings(Map(
          ConnectorFormatter.NAME_KEY -> name,
          ConnectorFormatter.TOPIC_NAMES_KEY -> StringList.toJsonString(Collections.singletonList(topicName)),
          ConnectorFormatter.NUMBER_OF_TASKS_KEY -> numberOfTasks.toString
        ))
        .run)
    settingInfo.className.get shouldBe classOf[MyConnector].getName
    settingInfo.settings.size should not be 0
    settingInfo.name.get shouldBe name
    settingInfo.topicNames.asScala shouldBe Seq(topicName)
    settingInfo.numberOfTasks.get shouldBe numberOfTasks
  }

  @Test
  def testValidateWithoutValue(): Unit = {
    val settingInfo = result(workerClient.connectorValidator().className(classOf[MyConnector].getName).run)
    settingInfo.className.get shouldBe classOf[MyConnector].getName
    settingInfo.settings.size should not be 0
    settingInfo.name.isPresent shouldBe false
    settingInfo.topicNames.isEmpty shouldBe true
    settingInfo.numberOfTasks.isPresent shouldBe false
  }
}
