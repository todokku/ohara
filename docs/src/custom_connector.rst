..
.. Copyright 2019 is-land
..
.. Licensed under the Apache License, Version 2.0 (the "License");
.. you may not use this file except in compliance with the License.
.. You may obtain a copy of the License at
..
..     http://www.apache.org/licenses/LICENSE-2.0
..
.. Unless required by applicable law or agreed to in writing, software
.. distributed under the License is distributed on an "AS IS" BASIS,
.. WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
.. See the License for the specific language governing permissions and
.. limitations under the License.
..

.. _connector:

Custom Connector Guideline
==========================

Ohara custom connector is based on `kafka
connector <https://docs.confluent.io/current/connect/managing/index.html>`__.
It offers a platform that enables you to define some simple actions to
connect topic to any other system. You don’t need to worry the
application availability, data durability, or distribution anymore. All
you have to do is to write your custom connector, which can have only
the pull()/push() method, and then compile your code to a jar file.
After uploading your jar to ohara, you are able to **deploy** your
connector on the :ref:`worker cluster <rest-workers-create>`. By leveraging
ohara connector framework, apart from the availability, scalability, and
durability, you can also monitor your connector for
:ref:`logs <rest-logs>` and :ref:`metrics <connector-metrics>`.

The following sections start to explain how to write a good connector on
ohara. You don’t need to read it through if you are familiar with `kafka
connector <https://docs.confluent.io/current/connect/managing/index.html>`__.
However, ohara connector has some improvements which are not in `kafka
connector <https://docs.confluent.io/current/connect/managing/index.html>`__
so it has worth of taking a look at :ref:`metrics <connector-metrics>` and
:ref:`setting definitions <setting-definition>`


---------------------------

Ohara Connector Overview
------------------------

Ohara connector is composed of :ref:`source connector <connector-sourceconnector>`
and :ref:`sink connector <connector-sink>`.
:ref:`source connector <connector-sourceconnector>` is used to pull data **from external
system to topic**. By contrast, :ref:`sink connector <connector-sink>` is
used to pull data from **topic to external system**. A complete
connector consists of **SourceConnector** / **SinkConnector** and
**SourceTask** / **SinkTask**. Worker cluster picks up a node to host your
source/sink connector and then distributes the source/sink tasks across
cluster.

You must include ohara jars before starting to write your custom
connector. Please include both of ohara-common and ohara-kafka in your
dependencies. The ohara-common contains many helper methods and common
data used in whole ohara. The ohara-kafka offers a lot of beautiful APIs
to help you to access kafka and design custom connector.

.. code-block:: groovy

   repositories {
        maven {
            url "https://dl.bintray.com/oharastream/ohara"
        }
    }
   implementation "oharastream.ohara:ohara-common:$|version|"
   implementation "oharastream.ohara:ohara-kafka:$|version|"

.. note::
   The `releases <https://github.com/oharastream/ohara/releases>`__ page shows the available version of ohara


---------------------------

.. _connector-datamodel:

Data Model
----------

Ohara has defined a table structure data in code base. We call it
**row**. A row is comprised of multiple **cells**. Each cell has its
**name**, **value** and **tags**. The value in cell is a generic type
which accepts any serializable type of value. Following is an example
that shows you how to convert a csv data to ohara row.

::

   c0,c1,c2
   v0,v1,v2

The above data can be converted to ohara row by following code.

.. code-block:: java

   import oharastream.ohara.common.data.Row;
   import oharastream.ohara.common.data.Cell;
   class ExampleOfRow {
       public static void main(String[] args) {
           Row row = Row.of(
                   Cell.of("c0", "v0"),
                   Cell.of("c1", "v1"),
                   Cell.of("c2", "v2")
                   );
       }
   }

::

   c0,c1,c2
   v0,,v2

The above data can be converted to ohara row by following code.

.. code-block:: java

   import oharastream.ohara.common.data.Row;
   import oharastream.ohara.common.data.Cell;
   class ExampleOfRow {
       public static void main(String[] args) {
           Row row = Row.of(
                   Cell.of("c0", "v0"),
                   Cell.of("c2", "v2")
                   );
       }
   }

Don’t worry about the serialization. Ohara offers default serializations
for following data types:

- string 
- boolean 
- short 
- int 
- long
- float 
- double 
- bytes 
- serializable object 
- row (a nested row is acceptable!)

.. note::

   The default serializer is located at :ohara-source:`Here <ohara-common/src/main/java/oharastream/ohara/common/data/Serializer.java>`

When you get the rows in connector, you should follow the **cell
setting** to generate the output. The **cell setting** in ohara is
called **column**. It shows the metadata of a **cell**. The metadata
consists of:

#. origin column name (**string**) — you can match the cell by this name
#. new column name — the new name of output.
#. type (**DataType**) — the type of output value. Whatever the origin type of
   value, you should convert the value according this type. Don’t worry the
   casting error. It is up to the user who pass the wrong configuration.

    - string
    - boolean
    - short
    - int
    - long
    - float
    - double
    - bytes
    - serializable object
    - row
#. order (**int**) — the order of cells in output.

An example of converting data according to columns.

.. code-block:: java

   import oharastream.ohara.common.data.Cell;
   import oharastream.ohara.common.data.Column;
   class ExampleOfConverting {
       public static Object hello(Column column, String rawValue) {
           switch (column.dataType) {
               case DataType.BOOLEAN:
                   return Boolean.valueOf(rawValue);
               case DataType.STRING:
                   return rawValue;
               case DataType.SHORT:
                   return Short.valueOf(rawValue);
               case DataType.INT:
                   return Integer.valueOf(rawValue);
               case DataType.FLOAT:
                   return Float.valueOf(rawValue);
               case DataType.DOUBLE:
                   return Double.valueOf(rawValue);
               default:
                   throw new IllegalArgumentException("unsupported type:" + column.dataType);
           }
       }
   }

The type is a complicated issue since there are countless types in this
world. It is impossible to define a general solution to handle all types
so the final types of value is **byte array** or **serializable
object**. If the type you want to pass is not in official support, you
should define it as **byte array** or **serializable object** and then
process it in your connectors.

.. note::
   Feel free to throw an exception when your connector encounter a
   unknown type. Don’t swallow it and convert to a weird value, such as
   null or empty. Throwing exception is better than generating corrupt
   data!

---------------------------

.. _connector-sourceconnector:

Source Connector
----------------

Source connector is used to pull data from outside system and then push
processed data to ohara topics. A basic implementation for a source
connector only includes four methods - **run**, **terminate**, **taskClass**, and **taskSetting**

.. code-block:: java

   public abstract class RowSourceConnector extends SourceConnector {
     /**
      * Returns the RowSourceTask implementation for this Connector.
      *
      * @return a RowSourceTask class
      */
     protected abstract Class<? extends RowSourceTask> taskClass();

     /**
      * Return the settings for source task.
      *
      * @param maxTasks number of tasks for this connector
      * @return a seq from settings
      */
     protected abstract List<TaskSetting> taskSetting(int maxTasks);

     /**
      * Start this Connector. This method will only be called on a clean Connector, i.e. it has either
      * just been instantiated and initialized or terminate() has been invoked.
      *
      * @param taskSetting configuration settings
      */
     protected abstract void run(TaskSetting taskSetting);

     /** stop this connector */
     protected abstract void terminate();
   }

.. _connector-source-start:

run(TaskSetting)
^^^^^^^^^^^^^^^^

  After instantizing a connector, the first method called by worker is **start()**.
  You should initialize your connector in **start** method, since it has a input
  parameter **TaskSetting** carrying all settings, such as target topics, connector
  name and user-defined configs, from user. If you (connector developer) are a good
  friend of your connector user, you can get (and cast it to expected type) config,
  which is passed by connector user, from **TaskSetting**. For example, a connector
  user calls :ref:`Connector API <rest-connectors-create-settings>`
  to store a config k0-v0 (both of them are string type) for your connector, and then
  you can get v0 via TaskSetting.stringValue(“k0”).

.. note::
   Don’t be afraid of throwing exception when you notice that input
   parameters are incorrect. Throwing an exception can fail a connector
   quickly and stop worker to distribute connector task across cluster.
   It saves the time and resources.


We all hate wrong configs, right? When you design the connector, you can
**define** the :ref:`setting <setting-definition>` on your own
initiative. The :ref:`setting <setting-definition>` enable worker to
check the input configs before starting connector. It can’t eliminate
incorrect configs completely, but it save your time of fighting against
wrong configs (have a great time with your family)


.. _connector-source-terminate:

terminate()
^^^^^^^^^^^

  This method is invoked by calling :ref:`STOP API <rest-stop-stream>`.
  You can release the resources allocated by connector, or send a email to shout at someone.
  It is ok to throw an exception when you fails to **stop** the connector.
  Worker cluster will mark **failure** on the connector, and the world
  keeps running.

.. _connector-source-taskclass:

taskClass()
^^^^^^^^^^^^

  This method returns the java class of :ref:`RowSourceTask <connector-sourcetask>`
  implementation. It tells worker cluster which class should be created to
  pull data from external system. Noted that connector and task may not be
  created on same node (jvm) so you should NOT share any objects between
  them (for example, make them to access a global variable).

.. _connector-source-tasksetting:

taskSetting(int maxTasks)
^^^^^^^^^^^^^^^^^^^^^^^^^^

  Connector has to generate configs for each task. The value of
  **maxTasks** is configured by :ref:`Connector API <rest-connectors>`. If you prefer to make all tasks
  do identical job, you can just clone the task config passe by
  :ref:`start <connector-source-start>`. Or you can prepare different configs for
  each task. Noted that the number of configuration you return MUST be
  equal with input value - maxTasks. Otherwise, you will get a exception
  when running your connector.

.. note::

   It would be better to do the final check to input configs in
   Connector rather than Task. Producing a failure quickly save your
   time and resources.

---------------------------

.. _connector-sourcetask:

Source Task
-----------

.. code-block:: java

   public abstract class RowSourceTask extends SourceTask {

     /**
      * Start the Task. This should handle any configuration parsing and one-time setup from the task.
      *
      * @param config initial configuration
      */
     protected abstract void run(TaskSetting config);

     /**
      * Signal this SourceTask to stop. In SourceTasks, this method only needs to signal to the task
      * that it should stop trying to poll for new data and interrupt any outstanding poll() requests.
      * It is not required that the task has fully stopped. Note that this method necessarily may be
      * invoked from a different thread than pollRecords() and commitOffsets()
      */
     protected abstract void terminate();
     /**
      * Poll this SourceTask for new records. This method should block if no data is currently
      * available.
      *
      * @return a array from RowSourceRecord
      */
     protected abstract List<RowSourceRecord> pollRecords();
   }  

RowSourceTask is the unit of executing **poll**. A connector can invokes
multiple tasks if you set **tasks.max** be bigger than 1 via :ref:`Connector API <rest-connectors>`.
RowSourceTask has similar lifecycle to Source connector. Worker cluster call **start** to
initialize a task and call **stop** to terminate a task.


.. _connector-sourcetask-pull-records:

pullRecords()
^^^^^^^^^^^^^

  You can ignore all methods except for **pollRecords**. Worker cluster call **pollRecords** regularly to get **RowSourceRecord** s
  and then save them to topics. Worker cluster does not care for your implementation. All you have to do is to put your data in
  **RowSourceRecord**. RowSourceRecord is a complicated object having many elements. Some elements are significant.
  For example, **partition** can impact the distribution of records. In order to be the best friend of programmer,
  ohara follows fluent pattern to allow you to create record through builder, and you can only fill the required elements.


.. code-block:: java

   public class ExampleOfRowSourceRecord {
       public static RowSourceRecord create(Row row, String topicName) {
           return RowSourceRecord.builder()
           .row(row)
           .topicName(topicName)
           .build();
       }
   }

.. note::

   You can read the java docs of RowSourceRecord.Builder to see which default values are set for other (optional) elements.

.. _connector-source-partition-offsets:

Partition and Offsets in Source
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  De-duplicating data is not a easy job. When you keep pulling data from
  external system to topics, you always need a place to record which data
  have not processed. Connector offers two specific objects for you to
  record the **offset** and **partition** of your data. You can define a
  **partition** and a **offset** for RowSourceRecord. The durability is on
  Worker’s shoulder, and you are always doable to get **partition** and
  **offset** back even if the connector fail or shutdown.

.. code-block:: java

   public class ExampleOfRowSourceContext {
       public static Map<String, ?> getOffset(Map<String, ?> partition) {
           return RowSourceContext.offset(partition);
       }
   }


Both of them are Map type with string key and primitive type. Using Map
is a workaround to record the offsets for different connectors. You can
view them as a **flatten** json representation. For example, one of task
is handling file_a, and it has processed first line of file_a. Then the
pair of **partition** and **offset** look like

.. code-block:: json

   {
     "fileName": "file_a"
   }

.. code-block:: json

   {
     "offset": 1
   }

We can convert above json to **partition** and **offset** and then put them in **RowSourceRecord**.

.. code-block:: java

   public class ExampleOfPartitionAndOffset {
       public static RowSourceRecord addPartitionAndOffset(RowSourceRecord.Builder builder, String fileName, int offset) {
           Map<String, String> partition = Collections.singletonMap("fileName", fileName);
           Map<String, Integer> offset = Collections.singletonMap("offset", 1);
           return builder.sourcePartition(partition)
           .sourceOffset(offset)
           .build();
       }
   }

A news of **partition** and **offset** is that they are not stored with
data in RowSourceRecord. If you want to know the commit of **partition**
and **offset**, you can override the **commitOffsets()**.

.. code-block:: java

   public abstract class RowSourceTask extends SourceTask {
     /**
      * Commit the offsets, up to the offsets that have been returned by pollRecords(). This method should
      * block until the commit is complete.
      *
      * <p>SourceTasks are not required to implement this functionality; Kafka Connect will record
      * offsets automatically. This hook is provided for systems that also need to store offsets
      * internally in their own system.
      */
     protected void commitOffsets() {
       // do nothing
     }
   }

.. _connector-sourcetask-handle-exception:

Handle Exception in pollRecords()
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  Throwing exception make connector in **failure** state, and inactivate connector until you restart it. Hence, you SHOULD catch and handle the exception as best you can. However, swallowing all exception is also a weired behavior. You SHOULD fails the connector when encountering unrecoverable exception.


Blocking Action Is Unwelcome In pollRecords()
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  Task is executed on a separate thread and there are many remaining processing for data after pollRecords(). Hence, you should NOT block pollRecords(). On the contrary, returning an empty list can yield the resource to remaining processing.

.. note::

   Returning null results in same result. However, we all should hate
   null so please take away null from your code.


Data From pollRecords() Are Committed Async
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  You don’t expect that the data you generated are commit at once, right? Committing data invokes a large latency since we need to sync data to multiple nodes and result in many disk I/O. Worker has another thread sending your data in background. If your connector needs to know the time of committing data, you can override the **commitOffsetsRecord(RowSourceRecord)**.

.. code-block:: java

   public abstract class RowSourceTask extends SourceTask {
     /**
      * Commit an individual RowSourceRecord when the callback from the producer client is received, or
      * if a record is filtered by a transformation. SourceTasks are not required to implement this
      * functionality; Kafka Connect will record offsets automatically. This hook is provided for
      * systems that also need to store offsets internally in their own system.
      *
      * @param record RowSourceRecord that was successfully sent via the producer.
      */
     protected void commitOffsetsRecord(RowSourceRecord record) {
       // do nothing
     }
   }

--------------

.. _connector-sink:

Sink Connector
--------------

.. code-block:: java

   public abstract class RowSinkConnector extends SinkConnector {

     /**
      * Start this Connector. This method will only be called on a clean Connector, i.e. it has either
      * just been instantiated and initialized or terminate() has been invoked.
      *
      * @param config configuration settings
      */
     protected abstract void run(TaskSetting config);

     /** stop this connector */
     protected abstract void terminate();

     /**
      * Returns the RowSinkTask implementation for this Connector.
      *
      * @return a RowSinkTask class
      */
     protected abstract Class<? extends RowSinkTask> taskClass();

     /**
      * Return the settings for source task. NOTED: It is illegal to assign different topics to
      * RowSinkTask
      *
      * @param maxTasks number of tasks for this connector
      * @return the settings for each tasks
      */
     protected abstract List<TaskSetting> taskSetting(int maxTasks);
   }

Sink connector is similar to :ref:`source connector <connector-sourceconnector>`.
It also have :ref:`run(TaskSetting) <connector-source-start>`,
:ref:`terminate() <connector-source-terminate>`,
:ref:`taskClass() <connector-source-taskclass>`,
:ref:`taskSetting(int maxTasks) <connector-source-tasksetting>`,
:ref:`partition and offsets <connector-source-partition-offsets>`. The main difference
between sink connector and source connector is that sink connector do
pull data from topic and then push processed data to outside system.
Hence, it does have :ref:`pullRecords <connector-sinktask-put-records>` rather
than :ref:`pullRecords <connector-sourcetask-pull-records>`

.. note::
   Though sink connector and source connector have many identical
   methods, you should NOT make a connector mixed sink and source.
   Because Both connector are **abstract** class, you can’t have a class
   extending both of them in java.

Sink connector also has to provide the task class to worker cluster. The
sink task in ohara is called **RowSinkTask**. It is also distributed
across whole worker cluster when you running a sink connector.

---------------------------

Sink Task
---------

.. code-block:: java

   public abstract class RowSinkTask extends SinkTask {

     /**
      * Start the Task. This should handle any configuration parsing and one-time setup from the task.
      *
      * @param config initial configuration
      */
     protected abstract void run(TaskSetting config);

     /**
      * Perform any cleanup to stop this task. In SinkTasks, this method is invoked only once
      * outstanding calls to other methods have completed (e.g., pullRecords() has returned) and a final
      * flush() and offset commit has completed. Implementations from this method should only need to
      * perform final cleanup operations, such as closing network connections to the sink system.
      */
     protected abstract void terminate();

     /**
      * Put the table record in the sink. Usually this should send the records to the sink
      * asynchronously and immediately return.
      *
      * @param records table record
      */
     protected abstract void pullRecords(List<RowSinkRecord> records);
   }  

RowSinkTask is similar to :ref:`RowSourceTask <connector-sourcetask>` that both of
them have **run** and **stop** phase. RowSinkTask is executed by a
separate thread on worker also.


.. _connector-sinktask-put-records:

pullRecords(List<RowSinkRecord> records)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Worker invokes a separate thread to fetch data from topic and put the
data to sink task. The input data is called **RowSinkRecord** which
carries not only row but also metadata.

#. topicName (**string**) — where the data come from
#. Row (**row**) — input data
#. partition (**int**) — index of partition
#. offset (**long**) — offset in topic-partition
#. timestamp (**long**) — data timestamp
#. TimestampType (**enum**) — the way of generating timestamp
    - NO_TIMESTAMP_TYPE — means timestamp is nothing for this data
    - CREATE_TIME — the timestamp is provided by user or the time of sending this data
    - LOG_APPEND_TIME — the timestamp is broker’s local time when the data is append


Partition and Offsets In Sink
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Sink task has a component, which is called **RowSinkContext**, saving
the offset and partitions for input data. Commonly, it is not big news
to you since kafka has responsibility to manage data offset in
topic-partition to avoid losing data. However, if you have something
more than data lost, such as exactly once, you can manage the data
offset manually and then use RowSinkContext to change the offset of
input data.


Handle Exception In pullRecords(List<RowSinkRecord>)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Any thrown exception will make this connector failed and stopped. You should handle the recoverable error and
throw the exception which obstruct connector from running.

.. code-block:: java

   public interface RowSinkContext {
     /**
      * Reset the consumer offsets for the given topic partitions. SinkTasks should use this if they
      * manage offsets in the sink data store rather than using Kafka consumer offsets. For example, an
      * HDFS connector might record offsets in HDFS to provide exactly once delivery. When the SinkTask
      * is started or a rebalance occurs, the task would reload offsets from HDFS and use this method
      * to reset the consumer to those offsets.
      *
      * <p>SinkTasks that do not manage their own offsets do not need to use this method.
      *
      * @param offsets map from offsets for topic partitions
      */
     void offset(Map<TopicPartition, Long> offsets);

     /**
      * Reset the consumer offsets for the given topic partition. SinkTasks should use if they manage
      * offsets in the sink data store rather than using Kafka consumer offsets. For example, an HDFS
      * connector might record offsets in HDFS to provide exactly once delivery. When the topic
      * partition is recovered the task would reload offsets from HDFS and use this method to reset the
      * consumer to the offset.
      *
      * <p>SinkTasks that do not manage their own offsets do not need to use this method.
      *
      * @param partition the topic partition to reset offset.
      * @param offset the offset to reset to.
      */
     default void offset(TopicPartition partition, Long offset) {
       this.offset(Collections.singletonMap(partition, offset));
     }
   }

.. note::

   Noted that data offset is a order in topic-partition so the input of RowSinkContext.offset consists of topic name and partition.


Handle Exception In pullRecords(List<RowSinkRecord>)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

see :ref:`handle exception in pollRecords() <connector-sourcetask-handle-exception>`


Commit Your Output Data When Kafka Commit Input Data
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

While feeding data into your sink task, kakfa also tries to commit
previous data that make the data disappear from you. The method
**preCommitOffsets** is a callback of committing data offset. If you want to
manage the offsets, you can change what to commit by kafka. Another use
case is that you have some stuff which needs to be committed also, and
you can trigger the commit in this callback.

.. code-block:: java

   public abstract class RowSinkTask extends SinkTask {
     /**
      * Pre-commit hook invoked prior to an offset commit.
      *
      * <p>The default implementation simply return the offsets and is thus able to assume all offsets
      * are safe to commit.
      *
      * @param offsets the current offset state as from the last call to pullRecords, provided for convenience
      *     but could also be determined by tracking all offsets included in the RowSourceRecord's
      *     passed to pullRecords.
      * @return an empty map if Connect-managed offset commit is not desired, otherwise a map from
      *     offsets by topic-partition that are safe to commit.
      */
     protected Map<TopicPartition, TopicOffset> preCommitOffsets(Map<TopicPartition, TopicOffset> offsets) {
       return offsets;
     }
   }  

.. note:: The offsets exceeding the latest consumed offset are discarded

--------------

.. _connector-version:

Version
-------

We all love to show how good we are. If you are a connector designer,
ohara connector offers a way to show the version, revision and author for
a connector.

.. code-block:: java

   public abstract class RowSourceConnector extends SourceConnector {
     public String version() {
       return VersionUtils.VERSION;
     }
     public String author() {
       return VersionUtils.USER;
     }
     public String revision() {
        return VersionUtils.REVISION;
     }
   }

The default value is version of build. You can override one of them or all of them when writing connector. The version
information of a connector is showed by :ref:`Worker APIs <rest-workers>`.

.. warning:: Don’t return null, please!!!

Version in ohara connector is different to kafka connector. The later
only supports **version** and it’s APIs show only **version**. Hence,
you can’t get revision, author or other :ref:`settings <setting-definition>`
through kafka APIs

--------------

.. _connector-metrics:

Metrics
-------

We are live in a world filled with number, and so do connectors. While a
connector is running, ohara collects many counts from the data flow for
the connector in background. All of counters (and other records which
will be introduced in the future) are called **metrics**, and it can be
fetched by :ref:`Connector API <rest-connectors>`. Apart
from official metrics, connector developers are also able to build
custom metrics for custom connectors, and all custom metrics are also
showed by :ref:`Connector API <rest-connectors>`.

Ohara leverage JMX to offer the metrics APIs to connector. It means all
metrics you created are stored as Java beans and is accessible through
JMX service. That is why you have to define a port via :ref:`Worker APIs <rest-workers>`
for creating a worker cluster.
Although you can see all java mbeans via the JMX client (such as JMC),
ohara still encourage you to apply :ref:`Connector API <rest-connectors>`
as it offers a more readable format of metrics.


.. _connector-counter:

Counter
^^^^^^^

Counter is a common use case for metrics that you can
increment/decrement/add/ a number atomically. A counter consists of
following members.

#. group (**string**) — the group of this counter
#. name (**string**) — the name of this counter
#. unit (**string**) — the unit of value
#. document (**string**) — the document for this metrics
#. startTime (**long**) — the time to start this counter
#. value (**long**) — current value of count

A example of creating a counter is shown below.

.. code-block:: java

   public class ExampleOfCreatingCounter {
     public static Counter sizeCounter(String group) {
       return Counter.builder()
           .group(group)
           .name("row.size")
           .unit("bytes")
           .document("size (in bytes) of rows")
           .startTime(CommonUtils.current())
           .value(0)
           .register();
     }
   }

.. note::
   Though **unit** and **document** are declared optional, making them
   have meaning description can help reader to understand the magic
   number from your counter.

.. note::
   The counter created by connector always has the group same to id of
   connector, since ohara needs to find the counters for specific
   connector in :ref:`Connector API <rest-connectors>`


Official Metrics
^^^^^^^^^^^^^^^^

There are two official metrics for connector - row counter and bytes
counter. The former is the number of processed rows, and the later is
the number of processed data. Both of them are updated when data are
pull/push from/to your connector. Normally, you don’t need to care for
them when designing connectors. However, you can read the source code in
ConnectorUtils.java to see how ohara create official counters.


Create Your Own Counters
^^^^^^^^^^^^^^^^^^^^^^^^

In order to reduce your duplicate code, ohara offers the
**CounterBuilder** to all connectors. CounterBuilder is a wrap of
Counter.Builder with some pre-defined variables, and hence the creation
of CounterBuilder must be after initializing the connector/task.

.. code-block:: java

  public class ExampleOfCreatingCustomBuilder {
    public static Counter custom(RowSinkTask task) {
      return task.counterBuilder()
        .unit("bytes")
        .document("size (in bytes) of rows")
        .startTime(CommonUtils.current())
        .value(0)
        .register();
    }
  }

.. note::
   Ohara doesn’t obstruct you from using Counter directly. However,
   using CounterBuilder make sure that your custom metrics are available
   in :ref:`Connector API <rest-connectors>`.


--------------

.. _connector-csv-sink:

Csv Sink Connector
------------------

.. figure:: images/csv_sink_connector_arch.png
   :alt: Ohara CSV Sink Connector Inheritance Architecture

Csv Sink connector inherits from :ref:`Row Sink Connector <connector-sink>`.
It also have :ref:`run(TaskSetting) <connector-source-start>`,
:ref:`terminate() <connector-source-terminate>`,
:ref:`taskClass() <connector-source-taskclass>`,
:ref:`taskSetting(int maxTasks) <connector-source-tasksetting>`,
:ref:`partition and offsets <connector-source-partition-offsets>`. The main difference
between csv sink connector and row sink connector is that csv sink connector already
has some default definitions.

Below is a list of default definitions for CsvSinkConnector:

#. TOPICS_DIR_DEFINITION: Read csv data from topic and then write to this folder
#. FLUSH_SIZE_DEFINITION: Number of records write to store before invoking file commits
#. ROTATE_INTERVAL_MS_DEFINITION: Commit file time
#. FILE_NEED_HEADER_DEFINITION: File need header for flush data
#. FILE_ENCODE_DEFINITION: File encode for write to file

Connector developers can override **customSettingDefinitions** to add other additional definitions:

.. code-block:: java

  public abstract class CsvSinkConnector extends RowSinkConnector {
    /**
     * Define the configuration for the connector.
     *
     * @return The SettingDef for this connector.
     */
    protected List<SettingDef> customSettingDefinitions() {
      return Collections.emptyList();
    }
  }

.. _connector-csv-sink-task:

Csv Sink Task
------------------

Ohara has a well-incubated task class. We call it **CsvSinkTask**. As long as your
data format is CSV type, you can use id to develop a sink connector to connect
various file systems.

We all know that to make a strong and robust connector, you have to take care of
a lot of details. In order to ensure that the connector works, we must also prepare
a lot of tests. Connector developers will spend a lot of time on this.

Therefore, we have encapsulated most of the logic in CsvSinkTask, which hides a lot of
complex behaviors. Just provide a :ref:`Storage <connector-storage>` implementation to
complete a sink connector. You can save time to enjoy other happy things.

The following are the two methods you need to care about inherited CsvSinkTask:

.. code-block:: java

  public abstract class CsvSinkTask extends RowSinkTask {
    /**
     * Returns the Storage implementation for this Task.
     *
     * @param setting initial settings
     * @return a Storage instance
     */
    public abstract Storage _storage(TaskSetting setting);
  }

_storage(TaskSetting setting)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The goal of Task is to write the data to an external file system. For example, if we want to
store the output files on FTP server, connector developers must provide an implementation
of :ref:`Storage <connector-storage>` that can access FTP.

.. note::
  The input parameter *TaskSetting* carrying all settings. see :ref:`TaskSetting <connector-source-tasksetting>`

.. _connector-storage:

Storage
-------

This interface defines some common methods for accessing the file system, such as checking
for the existence of a file, creating a new file, or reading an exiting file, etc. Connector
developers can follow this interface to implement different file systems, such as FTP, HDFS,
SMB, Amazon S3, etc. So, just provide the implementation of Storage to CsvSinkTask and you
can implement a :ref:`Sink Connector <connector-sink>` very quickly.

Below we list the important methods in the Storage interface:

.. code-block:: java

  public interface Storage extends Releasable {
    /**
     * Returns whether an object exists.
     *
     * @param path the path to the object.
     * @return true if object exists, false otherwise.
     */
    boolean exists(String path);

    /**
     * Creates a new object in the given path.
     *
     * @param path the path of the object to be created.
     * @throws OharaFileAlreadyExistsException if a object of that path already exists.
     * @throws OharaException if the parent container does not exist.
     * @return an output stream associated with the new object.
     */
    OutputStream create(String path);

    /**
     * Open for reading an object at the given path.
     *
     * @param path the path of the object to be read.
     * @return an input stream with the requested object.
     */
    InputStream open(String path);

    /**
     * Move or rename a object from source path to target path.
     *
     * @param sourcePath the path to the object to move
     * @param targetPath the path to the target object
     * @return true if object have moved to target path , false otherwise.
     */
    boolean move(String sourcePath, String targetPath);

    /** Stop using this storage. */
    void close();
  }

.. note::
  You can read the :ohara-source:`FtpStorage <ohara-connector/src/main/scala/oharastream/ohara/connector/ftp/FtpStorage.scala>`
  as an example to see how to implement your own Storage.
