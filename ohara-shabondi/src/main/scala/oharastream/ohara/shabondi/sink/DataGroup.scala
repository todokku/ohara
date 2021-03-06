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
import java.util.concurrent.atomic.AtomicBoolean

import oharastream.ohara.common.util.Releasable
import com.typesafe.scalalogging.Logger

private[sink] class DataGroup(val name: String, brokerProps: String, topicNames: Seq[String], pollTimeout: JDuration)
    extends Releasable {
  private val log          = Logger(classOf[RowQueue])
  val queue                = new RowQueue(name)
  val producer             = new QueueProducer(name, queue, brokerProps, topicNames, pollTimeout)
  private[this] val closed = new AtomicBoolean(false)

  def resume(): Unit =
    if (!closed.get) {
      producer.resume()
    }

  def pause(): Unit =
    if (!closed.get) {
      producer.pause()
    }

  def isIdle(idleTime: JDuration): Boolean = queue.isIdle(idleTime)

  override def close(): Unit =
    if (closed.compareAndSet(false, true)) {
      producer.close()
      log.info("Group {} closed.", name)
    }
}
