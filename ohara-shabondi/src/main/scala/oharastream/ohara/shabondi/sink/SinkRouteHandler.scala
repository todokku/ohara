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

import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.{ExceptionHandler, Route}
import akka.stream.ActorMaterializer
import oharastream.ohara.common.data.Row
import oharastream.ohara.common.util.Releasable
import com.typesafe.scalalogging.Logger
import oharastream.ohara.shabondi.common.{JsonSupport, RouteHandler}

import scala.collection.mutable.ArrayBuffer
import scala.compat.java8.DurationConverters._
import scala.concurrent.duration._

private[shabondi] object SinkRouteHandler {
  def apply(config: SinkConfig, materializer: ActorMaterializer) =
    new SinkRouteHandler(config, materializer)
}

private[shabondi] class SinkRouteHandler(config: SinkConfig, materializer: ActorMaterializer) extends RouteHandler {
  import oharastream.ohara.shabondi.common.JsonSupport._

  private val actorSystem              = materializer.system
  implicit private val contextExecutor = actorSystem.dispatcher

  private val log              = Logger(classOf[SinkRouteHandler])
  private[sink] val dataGroups = SinkDataGroups(config)

  def scheduleFreeIdleGroups(interval: JDuration, idleTime: JDuration): Unit =
    actorSystem.scheduler.schedule(1 second, interval.toScala) {
      log.trace("scheduled free group, total group: {} ", dataGroups.size)
      dataGroups.freeIdleGroup(idleTime)
    }

  private val exceptionHandler = ExceptionHandler {
    case ex: Throwable =>
      log.error(ex.getMessage, ex)
      complete((StatusCodes.InternalServerError, ex.getMessage))
  }

  private def fullyPollQueue(queue: RowQueue): Seq[Row] = {
    val buffer    = ArrayBuffer.empty[Row]
    var item: Row = queue.poll()
    while (item != null) {
      buffer += item
      item = queue.poll()
    }
    buffer
  }

  def route: Route = handleExceptions(exceptionHandler) {
    (get & path("v0" / "poll")) {
      val group  = dataGroups.defaultGroup
      val result = fullyPollQueue(group.queue).map(row => JsonSupport.toRowData(row))
      complete(result)
    } ~ (get & path("v0" / "poll" / Segment)) { groupId =>
      val group  = dataGroups.createIfAbsent(groupId)
      val result = fullyPollQueue(group.queue).map(row => JsonSupport.toRowData(row))
      complete(result)
    }
  }

  override def close(): Unit = {
    Releasable.close(dataGroups)
  }
}
