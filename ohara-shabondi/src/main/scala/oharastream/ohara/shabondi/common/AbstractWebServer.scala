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

package oharastream.ohara.shabondi.common

import java.util.concurrent.atomic.AtomicReference

import akka.Done
import akka.actor.ActorSystem
import akka.event.Logging
import akka.http.scaladsl.Http
import akka.http.scaladsl.Http.ServerBinding
import akka.http.scaladsl.server.{Directives, Route}
import akka.http.scaladsl.settings.ServerSettings
import akka.stream.ActorMaterializer
import oharastream.ohara.common.util.Releasable

import scala.concurrent._
import scala.concurrent.duration.Duration
import scala.io.StdIn
import scala.util.{Failure, Success, Try}

/**
  * reference: akka.http.scaladsl.server.HttpApp
  */
abstract class AbstractWebServer extends Directives with Releasable {
  protected val actorSystemRef = new AtomicReference[ActorSystem]()

  implicit private val actorSystem = ActorSystem(Logging.simpleName(this).replaceAll("\\$", ""))
  actorSystemRef.set(actorSystem)

  implicit protected val materializer: ActorMaterializer = ActorMaterializer()

  protected def routes: Route

  protected def postBinding(binding: ServerBinding): Unit = {
    val hostname = binding.localAddress.getHostName
    val port     = binding.localAddress.getPort
    actorSystemRef.get().log.info(s"Server online at http://$hostname:$port/")
  }

  protected def postBindingFailure(cause: Throwable): Unit = {
    actorSystemRef.get().log.error(cause, s"Error starting the server ${cause.getMessage}")
  }

  protected def waitForShutdownSignal(system: ActorSystem)(implicit ec: ExecutionContext): Future[Done] = {
    val promise = Promise[Done]()
    sys.addShutdownHook {
      promise.trySuccess(Done)
    }
    Future {
      blocking {
        if (StdIn.readLine("Press <RETURN> to stop Shabondi WebServer...\n") != null)
          promise.trySuccess(Done)
      }
    }
    promise.future
  }

  protected def postServerShutdown(attempt: Try[Done], system: ActorSystem): Unit = {
    actorSystemRef.get().log.info("Shutting down the server")
  }

  def start(bindInterface: String, port: Int): Unit = {
    start(bindInterface, port, ServerSettings(actorSystem))
  }

  def start(bindInterface: String, port: Int, settings: ServerSettings): Unit = {
    implicit val executionContext: ExecutionContextExecutor = actorSystem.dispatcher

    val bindingFuture: Future[Http.ServerBinding] = Http().bindAndHandle(
      handler = routes,
      interface = bindInterface,
      port = port,
      settings = settings
    )

    bindingFuture.onComplete {
      case Success(binding) =>
        postBinding(binding)
      case Failure(cause) =>
        postBindingFailure(cause)
    }

    Await.ready(
      bindingFuture.flatMap(_ => waitForShutdownSignal(actorSystem)),
      Duration.Inf
    )

    bindingFuture
      .flatMap(_.unbind())
      .onComplete(attempt => {
        postServerShutdown(attempt, actorSystem)
        actorSystemRef.get().terminate()
      })
  }

  override def close(): Unit = {
    actorSystemRef.get.terminate()
  }
}
