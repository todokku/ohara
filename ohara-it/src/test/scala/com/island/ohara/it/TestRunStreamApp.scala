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

package com.island.ohara.it

import java.io.File

import com.island.ohara.client.configurator.v0.ContainerApi.ContainerState
import com.island.ohara.client.configurator.v0.StreamApi.StreamPropertyRequest
import com.island.ohara.client.configurator.v0.TopicApi.TopicCreationRequest
import com.island.ohara.client.configurator.v0.{StreamApi, TopicApi}
import com.island.ohara.common.util.{CommonUtil, Releasable}
import com.island.ohara.configurator.Configurator
import org.junit.{After, Before, Test}
import org.scalatest.Matchers

import scala.concurrent.Await
import scala.concurrent.duration._

class TestRunStreamApp extends IntegrationTest with Matchers {
  private[this] val configurator =
    Configurator.builder().advertisedHostname(CommonUtil.hostname()).advertisedPort(0).fake().build()

  private[this] val pipeline_id = "pipeline-id"
  private[this] val instances = 1

  private[this] val streamAppActionAccess =
    StreamApi.accessOfAction().hostname(configurator.hostname).port(configurator.port)
  private[this] val streamAppListAccess =
    StreamApi.accessOfList().hostname(configurator.hostname).port(configurator.port)
  private[this] val streamAppPropertyAccess =
    StreamApi.accessOfProperty().hostname(configurator.hostname).port(configurator.port)

  @Before
  def setup(): Unit = {
    //TODO remove this line after OHARA-1528 finished
    skipTest(s"this test cannot be running inside containerize env ; will be fixed in OHARA-1528")
  }

  @Test
  def testRunSimpleStreamApp(): Unit = {
    val from = "fromTopic"
    val to = "toTopic"

    Await.result(
      TopicApi
        .access()
        .hostname(configurator.hostname)
        .port(configurator.port)
        .add(TopicCreationRequest(from, Some(1), Some(1))),
      10 seconds
    )
    Await.result(
      TopicApi
        .access()
        .hostname(configurator.hostname)
        .port(configurator.port)
        .add(TopicCreationRequest(to, Some(1), Some(1))),
      10 seconds
    )

    val userJarPath =
      s"${System.getProperty("user.dir")}${File.separator}build${File.separator}resources${File.separator}test"
    val filePaths =
      new File(userJarPath)
        .listFiles()
        .filter(f => f.isFile && f.getName.endsWith("tests.jar"))
        .map(f => f.getPath)
        .toSeq

    // Upload Jar
    val jarData = Await.result(
      streamAppListAccess.upload(pipeline_id, filePaths),
      30 seconds
    )

    //Get topic information
    val topicInfos = Await.result(
      TopicApi.access().hostname(configurator.hostname).port(configurator.port).list(),
      10 seconds
    )
    val fromTopic = topicInfos
      .filter { info =>
        info.name == from
      }
      .map(_.id)
      .head
    val toTopic = topicInfos
      .filter { info =>
        info.name == to
      }
      .map(_.id)
      .head

    // Update StreamApp Properties
    val req = StreamPropertyRequest(
      CommonUtil.randomString(10),
      Seq(fromTopic),
      Seq(toTopic),
      instances
    )
    val streamAppProp = Await.result(
      streamAppPropertyAccess.update(jarData.head.id, req),
      10 seconds
    )
    streamAppProp.fromTopics.size shouldBe 1
    streamAppProp.toTopics.size shouldBe 1
    streamAppProp.instances shouldBe 1

    //Start StreamApp
    val res1 =
      Await.result(streamAppActionAccess.start(jarData.head.id), 60 seconds)
    res1.id shouldBe jarData.head.id
    res1.state.getOrElse("") shouldBe ContainerState.RUNNING

    //Stop StreamApp
    val res2 =
      Await.result(streamAppActionAccess.stop(jarData.head.id), 60 seconds)
    res2.state.isEmpty shouldBe true
  }

  @After
  def tearDown(): Unit = {
    Releasable.close(configurator)
  }
}