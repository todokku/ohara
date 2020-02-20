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

package oharastream.ohara.connector.smb

import java.util

import oharastream.ohara.client.filesystem.FileSystem
import oharastream.ohara.common.data.Column
import oharastream.ohara.common.setting.SettingDef
import oharastream.ohara.kafka.connector.csv.CsvConnectorDefinitions._
import oharastream.ohara.kafka.connector.csv.CsvSourceConnector
import oharastream.ohara.kafka.connector.{RowSourceTask, TaskSetting}

import scala.collection.JavaConverters._

class SmbSource extends CsvSourceConnector {
  private[this] var settings: TaskSetting = _
  private[this] var props: SmbProps       = _
  private[this] var schema: Seq[Column]   = _

  override protected def _taskClass(): Class[_ <: RowSourceTask] = classOf[SmbSourceTask]

  override protected def _taskSettings(maxTasks: Int): util.List[TaskSetting] = Seq.fill(maxTasks)(settings).asJava

  override protected[smb] def _start(settings: TaskSetting): Unit = {
    this.settings = settings
    this.props = SmbProps(settings)
    this.schema = settings.columns.asScala
    if (schema.exists(_.order == 0)) throw new IllegalArgumentException("column order must be bigger than zero")

    val fileSystem =
      FileSystem.smbBuilder
        .hostname(props.hostname)
        .port(props.port)
        .user(props.user)
        .password(props.password)
        .shareName(props.shareName)
        .build()

    try {
      val inputFolder = settings.stringValue(INPUT_FOLDER_KEY)
      verifyFolder(inputFolder)
      if (fileSystem.nonExists(inputFolder))
        throw new IllegalArgumentException(s"${inputFolder} doesn't exist")

      val completedFolder = settings.stringOption(COMPLETED_FOLDER_KEY)
      if (completedFolder.isPresent) {
        verifyFolder(completedFolder.get())
        if (fileSystem.nonExists(completedFolder.get())) fileSystem.mkdirs(completedFolder.get())
      }

      val errorFolder = settings.stringValue(ERROR_FOLDER_KEY)
      verifyFolder(errorFolder)
      if (fileSystem.nonExists(errorFolder)) fileSystem.mkdirs(errorFolder)
    } finally fileSystem.close()
  }

  private[this] def verifyFolder(dir: String): Unit = {
    if (dir.startsWith("/")) {
      throw new IllegalArgumentException(s"The $dir is invalid, we don't allow paths beginning with a slash.")
    }
  }

  override protected def _stop(): Unit = {
    //    do nothing
  }

  override protected def customCsvSettingDefinitions(): util.Map[String, SettingDef] = DEFINITIONS.asJava
}