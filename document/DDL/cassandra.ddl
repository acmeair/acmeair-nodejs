/*******************************************************************************
* Copyright (c) 2015 IBM Corp.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*******************************************************************************/

CREATE KEYSPACE acmeair_keyspace WITH REPLICATION = { 'class' : 'SimpleStrategy', 'replication_factor' : 3 };
use acmeair_keyspace;
  
CREATE TABLE n_airportcodemapping(
  id text PRIMARY KEY,
  content text
  )
  WITH COMPACT STORAGE;

CREATE TABLE n_booking(
  customerId text,
  id text,
  content text,
  PRIMARY KEY (customerId, id)
  )
  WITH COMPACT STORAGE;

CREATE TABLE n_customer(
  id text PRIMARY KEY,
  content text
  )
  WITH COMPACT STORAGE;

CREATE TABLE n_customersession(
  id text PRIMARY KEY,
  content text
  )
  WITH COMPACT STORAGE;

CREATE TABLE n_flight(
  flightSegmentId text,
  scheduledDepartureTime timestamp,
  id text,
  content text,
  PRIMARY KEY (flightSegmentId,scheduledDepartureTime,id)
  )
  WITH COMPACT STORAGE;

CREATE TABLE n_flightsegment(
  originPort text,
  destPort text,
  id text,
  content text,
  PRIMARY KEY (originPort,destPort,id)
  )
  WITH COMPACT STORAGE;
