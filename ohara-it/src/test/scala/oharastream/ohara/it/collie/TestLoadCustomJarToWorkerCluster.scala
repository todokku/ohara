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

package oharastream.ohara.it.collie

import java.io.File
import java.util.concurrent.TimeUnit

import oharastream.ohara.agent.DataCollie
import oharastream.ohara.agent.docker.DockerClient
import oharastream.ohara.client.configurator.v0.NodeApi.Node
import oharastream.ohara.client.configurator.v0._
import oharastream.ohara.client.kafka.ConnectorAdmin
import oharastream.ohara.common.setting.ObjectKey
import oharastream.ohara.common.util.Releasable
import oharastream.ohara.configurator.Configurator
import oharastream.ohara.it.category.CollieGroup
import oharastream.ohara.it.connector.{IncludeAllTypesSinkConnector, IncludeAllTypesSourceConnector}
import oharastream.ohara.it.{EnvTestingUtils, IntegrationTest, ServiceKeyHolder}
import com.typesafe.scalalogging.Logger
import org.junit.experimental.categories.Category
import org.junit.{After, Before, Test}

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
@Category(Array(classOf[CollieGroup]))
class TestLoadCustomJarToWorkerCluster extends IntegrationTest {
  private[this] val log = Logger(classOf[TestLoadCustomJarToWorkerCluster])

  private[this] val nodes: Seq[Node] = EnvTestingUtils.dockerNodes()

  private[this] val invalidHostname = "unknown"

  private[this] val invalidPort = 0

  private[this] val hostname: String = publicHostname.getOrElse(invalidHostname)

  private[this] val port = publicPort.getOrElse(invalidPort)

  private[this] val configurator: Configurator =
    Configurator.builder.hostname(hostname).port(port).build()

  private[this] val zkApi = ZookeeperApi.access.hostname(configurator.hostname).port(configurator.port)

  private[this] val bkApi = BrokerApi.access.hostname(configurator.hostname).port(configurator.port)

  private[this] val wkApi = WorkerApi.access.hostname(configurator.hostname).port(configurator.port)

  private[this] val containerApi = ContainerApi.access.hostname(configurator.hostname).port(configurator.port)

  private[this] val fileApi = FileInfoApi.access.hostname(configurator.hostname).port(configurator.port)

  private[this] val nameHolder = ServiceKeyHolder(DockerClient(DataCollie(nodes)))

  @Before
  def setup(): Unit =
    if (nodes.isEmpty || port == invalidPort || hostname == invalidHostname)
      skipTest(
        "public hostname and public port must exist so all tests in TestLoadCustomJarToWorkerCluster are ignored"
      )
    else {
      val nodeApi = NodeApi.access.hostname(configurator.hostname).port(configurator.port)
      nodes.foreach(node => result(nodeApi.request.node(node).create()))
    }

  @Test
  def test(): Unit = {
    val currentPath = new File(".").getCanonicalPath
    // Both jars are pre-generated. see readme in test/resources

    // jars should use "group" (here is worker name) to identify which worker cluster will use it
    val jars = result(
      Future.traverse(
        Seq(
          new File(currentPath, "build/libs/ohara-it-source.jar"),
          new File(currentPath, "build/libs/ohara-it-sink.jar")
        )
      )(file => {
        // avoid too "frequently" create group folder for same group files
        TimeUnit.SECONDS.sleep(1)
        fileApi.request.file(file).upload()
      })
    )

    val zkCluster = result(
      zkApi.request
        .key(nameHolder.generateClusterKey())
        .nodeNames(nodes.map(_.name).toSet)
        .create()
        .flatMap(info => zkApi.start(info.key).flatMap(_ => zkApi.get(info.key)))
    )
    assertCluster(
      () => result(zkApi.list()),
      () => result(containerApi.get(zkCluster.key).map(_.flatMap(_.containers))),
      zkCluster.key
    )
    log.info(s"zkCluster:$zkCluster")
    val bkCluster = result(
      bkApi.request
        .key(nameHolder.generateClusterKey())
        .zookeeperClusterKey(zkCluster.key)
        .nodeNames(nodes.map(_.name).toSet)
        .create()
        .flatMap(info => bkApi.start(info.key).flatMap(_ => bkApi.get(info.key)))
    )
    assertCluster(
      () => result(bkApi.list()),
      () => result(containerApi.get(bkCluster.key).map(_.flatMap(_.containers))),
      bkCluster.key
    )
    log.info(s"bkCluster:$bkCluster")
    val wkCluster = result(
      wkApi.request
        .key(nameHolder.generateClusterKey())
        .brokerClusterKey(bkCluster.key)
        .pluginKeys(jars.map(jar => ObjectKey.of(jar.group, jar.name)).toSet)
        .nodeName(nodes.head.name)
        .create()
    )
    result(wkApi.start(wkCluster.key))
    assertCluster(
      () => result(wkApi.list()),
      () => result(containerApi.get(wkCluster.key).map(_.flatMap(_.containers))),
      wkCluster.key
    )
    // add all remaining node to the running worker cluster
    nodes.filterNot(n => wkCluster.nodeNames.contains(n.name)).foreach { n =>
      result(wkApi.addNode(wkCluster.key, n.name))
    }
    // make sure all workers have loaded the test-purposed connector.
    result(wkApi.list()).find(_.name == wkCluster.name).get.nodeNames.foreach { name =>
      val connectorAdmin = ConnectorAdmin(wkCluster)
      await(
        () =>
          try result(connectorAdmin.plugins()).exists(_.className == classOf[IncludeAllTypesSinkConnector].getName)
            && result(connectorAdmin.plugins()).exists(_.className == classOf[IncludeAllTypesSourceConnector].getName)
          catch {
            case _: Throwable => false
          }
      )
    }
    await(() => {
      val connectors = result(
        InspectApi.access.hostname(configurator.hostname).port(configurator.port).workerInfo(wkCluster.key)
      ).classInfos
      connectors.map(_.className).contains(classOf[IncludeAllTypesSinkConnector].getName) &&
      connectors.map(_.className).contains(classOf[IncludeAllTypesSourceConnector].getName)
    })
  }

  @After
  final def tearDown(): Unit = {
    Releasable.close(configurator)
    Releasable.close(nameHolder)
  }
}
