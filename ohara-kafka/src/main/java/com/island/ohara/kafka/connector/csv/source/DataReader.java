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

package com.island.ohara.kafka.connector.csv.source;

import com.island.ohara.kafka.connector.RowSourceRecord;
import java.nio.file.Path;
import java.util.List;

/**
 * A data reader is used to transfer data to Kafka topics.
 *
 * <p>The following is the process we recommend, please try to refer to it.
 *
 * <p>1. Read content from the file and convert to source records.
 *
 * <p>2. Before return records to Kafka topics, you SHOULD move the file to the <b>completed</b>
 * folder, or delete it directly. Avoid processing duplicate data.
 *
 * <p>3. Finally, return records to Kafka topics.
 *
 * <p>The above is a normal process. If any errors occur in the normal process, you SHOULD move the
 * file to the <b>error</b> folder and return an empty list to Kafka topics.
 *
 * <p>Note that if unfortunately, failed to move the file to <b>error</b> folder, you SHOULD log the
 * failure reason and keep the file in the original folder.
 */
@FunctionalInterface
public interface DataReader {
  /**
   * Read content from a file and convert it to row source records.
   *
   * <p>Note: after the file is read, remember to release relevant resources.
   *
   * @param file the path of file
   * @return a list of RowSourceRecord
   */
  List<RowSourceRecord> read(Path file);
}
