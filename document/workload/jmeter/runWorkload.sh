#!/bin/bash
#*******************************************************************************
#* Copyright (c) 2015 IBM Corp.
#*
#* Licensed under the Apache License, Version 2.0 (the "License");
#* you may not use this file except in compliance with the License.
#* You may obtain a copy of the License at
#*
#*    http://www.apache.org/licenses/LICENSE-2.0
#*
#* Unless required by applicable law or agreed to in writing, software
#* distributed under the License is distributed on an "AS IS" BASIS,
#* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#* See the License for the specific language governing permissions and
#* limitations under the License.
#*******************************************************************************/

echo 'Here is the current env'
env

cmd="/var/lib/apache-jmeter-$JMETER_VERSION/bin/jmeter -n -t AcmeAir.jmx"
if [ ! -z $NUM_THREAD ] ; then
   cmd="$cmd -JNUM_THREAD=$NUM_THREAD"
fi

if [ ! -z $LOOP_COUNT ]; then
   cmd="$cmd -JLOOP_COUNT=$LOOP_COUNT"
fi

if [ ! -z $USE_PURE_IDS ]; then
   cmd="$cmd -DusePureIDs=$USE_PURE_IDS"
fi

cmd="$cmd -j logs/AcmeAir1.log -l logs/AcmeAir1.jtl"

echo Here is the current cmd: $cmd

target=""
if [ ! -z $APP_PORT_9080_TCP_ADDR ]; then
	target="$APP_PORT_9080_TCP_ADDR"
else
	target=""
fi

if [ ! -z $APP_PORT_9080_TCP_PORT ]; then
	target="$target,$APP_PORT_9080_TCP_PORT"
else
	target="$target,"
fi

if [ ! -z $CONTEXT_ROOT ]; then
	target="$target,$CONTEXT_ROOT"
else
	target="$target,"
fi

echo $target>hosts.csv

echo 'Here is the current hosts info'
cat hosts.csv

if [ ! -d "logs" ]; then
  mkdir logs
fi

echo 'starting jmeter run ...'

$cmd 

echo 'end jmeter run. you can copy the logs now.'