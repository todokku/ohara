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

package oharastream.ohara.configurator.route

import oharastream.ohara.client.configurator.v0.NodeApi
import oharastream.ohara.common.rule.OharaTest
import oharastream.ohara.common.util.{CommonUtils, Releasable}
import oharastream.ohara.configurator.Configurator
import org.junit.{After, Test}
import org.scalatest.Matchers._

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._
import scala.concurrent.{Await, Future}

class TestNodeNameUpperCaseRoute extends OharaTest {
  private[this] val numberOfCluster = 1
  private[this] val configurator =
    Configurator.builder.fake(numberOfCluster, numberOfCluster, "zookeepercluster").build()
  private[this] val nodeApi                    = NodeApi.access.hostname(configurator.hostname).port(configurator.port)
  private[this] def result[T](f: Future[T]): T = Await.result(f, 10 seconds)

  @Test
  def testAddNodeNameLowerCase(): Unit = {
    val name = CommonUtils.randomString(10).toLowerCase
    result(nodeApi.request.hostname(name).port(22).user("b").password("c").create()).name shouldBe name
  }

  @Test
  def testAddNodeNameUpperCase1(): Unit = {
    val name = CommonUtils.randomString(10).toUpperCase
    result(nodeApi.request.hostname(name).port(22).user("b").password("c").create())
  }

  @Test
  def testAddNodeNameUpperCase2(): Unit = {
    val name = "HOST1.test"
    result(nodeApi.request.hostname(name).port(22).user("b").password("c").create())
  }

  @Test
  def testAddNodeNameUpperCase3(): Unit = {
    val name = "aaa-Node1.test"
    result(nodeApi.request.hostname(name).port(22).user("b").password("c").create())
  }

  @After
  def tearDown(): Unit = Releasable.close(configurator)
}
