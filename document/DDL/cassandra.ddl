
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
