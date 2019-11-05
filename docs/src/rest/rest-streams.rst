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

.. _rest-streams:

StreamApp
=========

Ohara StreamApp is a unparalleled wrap of kafka streaming. It leverages
and enhances `Kafka Streams`_ to make
developer easily design and implement the streaming application. More
details of developing streaming application is in :ref:`custom stream guideline <streamapp>`.

Assume that you have completed a streaming application via ohara Java
APIs, and you have generated a jar including your streaming code. By
Ohara Restful APIs, you are enable to control, deploy, and monitor
your streaming application. As with cluster APIs, ohara leverages
docker container to host streaming application. Of course, you can
apply your favor container management tool including simple (based on ssh)
and k8s when you are starting ohara.

Before stating to use restful APIs, please ensure that all nodes have
downloaded the `StreamApp image`_.
The jar you uploaded to run streaming application will be included in
the image and then executes as a docker container. The `StreamApp image`_
is kept in each node so don’t worry about the network. We all hate
re-download everything when running services.

The following information of StreamApp are updated by ohara.

.. _rest-streamapp-stored-data:

streamApp stored data
~~~~~~~~~~~~~~~~~~~~~

#. settings (**object**) — custom settings. Apart from the following fields, you can add any setting if needed. Each
   setting should have it's own definition to be used in streamApp runtime.

   - the official support fields are listed below

     - name (**string**) — cluster name
     - group (**string**) — cluster group
     - jarKey (**object**) — the used jar key
     - jmxPort (**int**) — expose port for jmx
     - from (**array(TopicKey)**) — source topic
     - to (**array(TopicKey)**) — target topic
     - nodeNames (**array(string)**) — the nodes running the zookeeper process
     - brokerClusterKey (**object**) — the broker cluster key used for streamApp running

       - brokerClusterKey.group (**option(string)**) — the group of broker cluster
       - brokerClusterKey.name (**string**) — the name of broker cluster

       .. note::
          the following forms are legal as well. 1) {"name": "n"} and 2) "n". Both forms are converted to
          {"group": "default", "name": "n"}

     - tags (**object**) — the user defined parameters

#. nodeNames (**array(string)**) — node list of streamApp running container
#. aliveNodes (**array(string)**) — the nodes that host the running containers of streamapp cluster
#. state (**option(string)**) — only started/failed streamApp has state (DEAD if all containers are not running, else RUNNING)
#. error (**option(string)**) — the error message from a failed streamApp.
   If the streamApp is fine or un-started, you won't get this field.
#. :ref:`metrics <connector-metrics>` (**object**) — the metrics from this streamApp.

   - meters (**array(object)**) — the metrics in meter type

     - meters[i].value (**double**) — the number stored in meter
     - meters[i].unit (**string**) — unit for value
     - meters[i].document (**string**) — document of this meter
     - meters[i].queryTime (**long**) — the time of query metrics from remote machine
     - meters[i].startTime (**option(long)**) — the time of record generated in remote machine

#. lastModified (**long**) — last modified this jar time

.. _rest-streams-create-properties:

create properties of specific streamApp
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Create the properties of a streamApp.

*POST /v0/streams*

Example Request
  #. name (**string**) — new streamApp name. This is the object unique name ; default is random string.
  #. group (**string**) — group name for current streamApp ; default value is "default"
  #. imageName (**string**) — image name of streamApp used to ; default is oharastream/streamapp:|version|
  #. nodeNames (**array(string)**) — node name list of streamApp used to ; default is empty
  #. tags (**object**) — a key-value map of user defined data ; default is empty
  #. jarKey (**object**) — the used jar key

     - group (**string**) — the group name of this jar
     - name (**string**) — the name of this jar

  #. brokerClusterKey (**option(object)**) — the broker cluster used for streamApp running ; default we will auto fill this
     parameter for you if you don't specify it and there only exists one broker cluster.
  #. jmxPort (**int**) — expose port for jmx ; default is random port
  #. from (**array(TopicKey)**) — source topic ; default is empty array

     .. note::
        we only support one topic for current version. We will throw exception in start api if you assign
        more than 1 topic.

     [TODO] We will support multiple topics on issue :ohara-issue:`688`

  #. to (**array(TopicKey)**) — target topic ; default is empty array

     .. note::
        we only support one topic for current version. We will throw exception in start api if you assign
        more than 1 topic.

     [TODO] We will support multiple topics on issue :ohara-issue:`688`

Example Response
  Response format is as :ref:`streamApp stored format <rest-streamapp-stored-data>`.

  .. code-block:: json

    {
      "lastModified": 1563499550267,
      "aliveNodes": [],
      "aliveNodes": [],
      "metrics": {
        "meters": []
      },
      "settings": {
        "name": "a5eddb5b9fd144f1a75e",
        "brokerClusterKey": {
          "group": "default",
          "name": "4ef3d4a266"
        },
        "group": "default",
        "tags": {},
        "imageName": "oharastream/streamapp:$|VERSION|",
        "from": [],
        "to": [],
        "jarKey": {
          "group": "wk01",
          "name": "stream-app.jar"
        },
        "jmxPort": 3792,
        "nodeNames": ["node1"]
      }
    }

  .. note::
     The streamApp, which is just created, does not have any metrics.


.. _rest-streams-get-information:

get information from a specific streamApp cluster
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

*GET /v0/streams/${name}?group=$group*

.. note::
   We will use the default value as the query parameter "?group=" if you don't specify it.

Example Response
  Response format is as :ref:`streamApp stored format <rest-streamapp-stored-data>`.

  .. code-block:: json

     {
       "lastModified": 1563499550267,
       "aliveNodes": [],
       "metrics": {
         "meters": []
       },
       "settings": {
         "name": "a5eddb5b9fd144f1a75e",
         "group": "default",
         "brokerClusterKey": {
           "group": "default",
           "name": "4ef3d4a266"
         },
         "tags": {},
         "imageName": "oharastream/streamapp:$|version|",
         "from": [],
         "to": [],
         "jarKey": {
           "group": "wk01",
           "name": "ohara-streamapp.jar"
         },
         "jmxPort": 3792,
         "nodeNames": []
       }
     }

list information of streamApp cluster
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

*GET /v0/streams*

the accepted query keys are listed below.
#. group
#. name
#. lastModified
#. tags
#. state
#. aliveNodes
#. key in settings

Example Response
  Response format is as :ref:`streamApp stored format <rest-streamapp-stored-data>`.

  .. code-block:: json

     [
       {
         "lastModified": 1563499550267,
         "aliveNodes": [],
         "metrics": {
           "meters": []
         },
         "settings": {
           "name": "a5eddb5b9fd144f1a75e",
           "group": "default",
           "brokerClusterKey": {
             "group": "default",
             "name": "4ef3d4a266"
           },
           "tags": {},
           "imageName": "oharastream/streamapp:$|version|",
           "from": [],
           "to": [],
           "jarKey": {
             "group": "wk01",
             "name": "ohara-streamapp.jar"
           },
           "jmxPort": 3792,
           "nodeNames": []
         }
       }
     ]

.. _rest-streams-update-information:

update properties of specific streamApp
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Update the properties of a non-started streamApp.

*PUT /v0/streams/${name}?group=$group*

.. note::
   If the required streamApp (group, name) was not exists, we will try to use this request as
   :ref:`create streamApp <rest-streams-create-properties>`

#. imageName (**option(string)**) — image name of streamApp used to.
#. nodeNames (**option(array(string))**) — node name list of streamApp used to.
#. tags (**option(object)**) — a key-value map of user defined data.
#. jarKey (**option(option(object))**) — the used jar key

   - group (**option(string)**) — the group name of this jar
   - name (**option(string)**) — the name without extension of this jar

#. jmxPort (**option(int)**) — expose port for jmx.
#. from (**option(array(string))**) — source topic.

   .. note::
      we only support one topic for current version. We will throw exception in start api if you assign
      more than 1 topic.

   [TODO] We will support multiple topics on issue :ohara-issue:`688`

#. to (**option(array(string))**) — target topic.

   .. note::
      we only support one topic for current version. We will throw exception in start api if you assign
      more than 1 topic.

   [TODO] We will support multiple topics on issue :ohara-issue:`688`

Example Request
  .. code-block:: json

     {
       "imageName": "myimage",
       "from": ["newTopic1"],
       "to": ["newTopic2"],
       "jarKey": {
         "group": "newGroup",
         "name": "newJar.jar"
       },
       "jmxPort": 8888,
       "nodeNames": ["node1", "node2"]
     }

Example Response
  Response format is as :ref:`streamApp stored format <rest-streamapp-stored-data>`.

  .. code-block:: json

     {
        "lastModified": 1563503358666,
        "aliveNodes": [
          "node1", "node2"
        ],
        "metrics": {
          "meters": []
        },
        "settings": {
          "name": "myapp",
          "group": "default",
          "brokerClusterKey": {
            "group": "default",
            "name": "4ef3d4a266"
          },
          "tags": {},
          "imageName": "myimage",
          "jarKey": {
              "group": "newGroup",
              "name": "newJar.jar"
          },
          "to": ["newTopic2"],
          "from": ["newTopic1"],
          "jmxPort": 8888,
          "nodeNames": ["node1", "node2"]
        }
     }


delete properties of specific streamApp
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Delete the properties of a non-started streamApp. This api only remove
the streamApp component which is stored in pipeline.

*DELETE /v0/streams/${name}?group=$group*

.. note::
   We will use the default value as the query parameter "?group=" if you don't specify it.

**Example Response**

  ::

     204 NoContent

  .. note::
     It is ok to delete an nonexistent properties, and the response is 204
     NoContent.


start a StreamApp
~~~~~~~~~~~~~~~~~

*PUT /v0/streams/${name}/start?group=$group*

.. note::
   We will use the default value as the query parameter "?group=" if you don't specify it.

Example Response
  ::

    202 Accepted

  .. note::
     You should use :ref:`get streamapp <rest-streams-get-information>` to fetch up-to-date status

.. _rest-stop-streamapp:

stop a StreamApp
~~~~~~~~~~~~~~~~

This action will graceful stop and remove all docker containers belong
to this streamApp. Note: successful stop streamApp will have no status.

*PUT /v0/streams/${name}/stop?group=$group[&force=true]*

Query Parameters
  #. force (**boolean**) — true if you don’t want to wait the graceful shutdown
     (it can save your time but may damage your data).

.. note::
   We will use the default value as the query parameter "?group=" if you don't specify it.

Example Response
  ::

    202 Accepted

  .. note::

     You should use :ref:`get streamapp <rest-streams-get-information>` to fetch up-to-date status

get topology tree graph from specific streamApp
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

[TODO] This is not implemented yet !

*GET /v0/streams/view/${name}*

Example Response
  #. jarInfo (**string**) — the upload jar information
  #. name (**string**) — the streamApp name
  #. poneglyph (**object**) — the streamApp topology tree graph

      - steles (**array(object)**) — the topology collection

         - steles[i].kind (**string**) — this component kind (SOURCE,
           PROCESSOR, or SINK)
         - steles[i].key (**string**) — this component kind with order
         - steles[i].name (**string**) — depend on kind, the name is

            - SOURCE — source topic name
            - PROCESSOR — the function name
            - SINK — target topic name

         - steles[i].from (**string**) — the prior component key (could be
           empty if this is the first component)
         - steles[i].to (**string**) — the posterior component key (could be
           empty if this is the final component)

  .. code-block:: json

     {
       "jarInfo": {
         "name": "stream-app",
         "group": "wk01",
         "size": 1234,
         "lastModified": 1542102595892
       },
       "name": "my-app",
       "poneglyph": {
         "steles": [
           {
             "kind": "SOURCE",
             "key" : "SOURCE-0",
             "name": "stream-in",
             "from": "",
             "to": "PROCESSOR-1"
           },
           {
             "kind": "PROCESSOR",
             "key" : "PROCESSOR-1",
             "name": "filter",
             "from": "SOURCE-0",
             "to": "PROCESSOR-2"
           },
           {
             "kind": "PROCESSOR",
             "key" : "PROCESSOR-2",
             "name": "mapvalues",
             "from": "PROCESSOR-1",
             "to": "SINK-3"
           },
           {
             "kind": "SINK",
             "key" : "SINK-3",
             "name": "stream-out",
             "from": "PROCESSOR-2",
             "to": ""
           }
         ]
       }
     }

.. _Kafka Streams: kafka streams <https://kafka.apache.org/documentation/streams
.. _StreamApp image: https://cloud.docker.com/u/oharastream/repository/docker/oharastream/streamapp