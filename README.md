# Acme Air in NodeJS 

An implementation of the Acme Air sample application for NodeJS.  This implementation can support multiple datastores, can run in several application modes, and can support running on a variety of runtime platforms including standalone bare metal  system, Virtual Machines, docker containers, IBM Bluemix, IBM Bluemix Container Service.

## Content

### Runtime Environment

[NodeJs](http://nodejs.org/download/)

### Datastore Choices

Environment variable dbtype is used to determine the datastore choice. MongoDB is default. See under "More on configurations".

* [MongoDB](http://www.mongodb.org) 
* [Cloudant](http://cloudant.com) 
* [Cassandra](http://cassandra.apache.org) 

### Application Mode

Environment variable AUTH_SERVICE is use to determine when Micro-Service is used. Default is Monolitic. See under "More on configurations".

#### Monolithic 

One NodeJS application. The default mode.

#### Micro-Service

Main NodeJS application delegates to authorization service NodeJS application hosted on host:port, defined in AUTH_SERVICE


### Application Run Platforms

* [Bluemix Instructions] (README_Bluemix.md)
* [Docker Instructions] (README_Docker.md)
* [Bluemix Container Service Instructions] (README_Bluemix_Container.md)


## How to get started

Assume MongoDB started on 127.0.0.1:27017

### Resolve module dependencies

	npm install

### Run Acmeair in Monolithic on Local

	node app.js
		
		
### Run Acmeair in Micro-Service on Local

	node authservice-app.js
	set AUTH_SERVICE=localhost:9443 or export AUTH_SERVICE=localhost:9443
	node app.js
	
### Run Acmeair in Micro-Service with Netflix Hystrix Stream enabled on Local

	node authservice-app.js
	set AUTH_SERVICE=localhost:9443 or export AUTH_SERVICE=localhost:9443
	set enableHystrix=true or export enableHystrix=true
	
	node app.js
	
	
### Access Application 

	http://localhost:9080/
	
	Load Database 
		preload 10k customers uid[0..9999]@email.com:password, 5 days' flights.  Defined in loader/loader-settings.json
	Login
	Flights
		such as Singapore to HongKong or Paris to Moscow 
	Checkin
		cancel some booked flights
	Account
		update account info
	Logout	
	
	If hystrix is enabled, it is available at : http://localhost:9080/rest/api/hystrix.stream
	
	
	
## More on Configurations

### Environment Variables

Name | Default | Meaning
--- | --- | ---
dbtype | mongo | You can switch between mongo,cloudant,cassandra for datastore choices. When running on Bluemix, dbtype is automactially discovered from the service the application is bound to.
AUTH_SERVICE |  | By default, there is only one main NodeJS application for all logics. When defined, in the format of host:port, it enables Micro-Service mode, main NodeJS application delegates to authorization service NodeJS application hosted on host:port. 
enableHystrix | false | setting it to true will enable hystrix stream available at /rest/api/hystrix.stream
MONGO_URL||Mongo database URL. Take precedence over other settings
CLOUDANT_URL||Cloudant database URL. Take precedence over other settings
CASSANDRA_CP||Cassandra Contact Points. Take precedence over other settings
CASSANDRA_KS||Cassandra keyspace. Take precedence over other settings

### Configuration for Runtime

Default values are defined [here](settings.json)

Name | Default | Meaning
--- |:---:| ---
mongoHost | 127.0.0.1 | MongoDB host ip
mongoPort | 27017 | MongoDB port
mongoConnectionPoolSize | 10 | MongoDB connection pool size
cloudant_host| | Cloudant database host name 
cloudant_port| 443 | Cloudant database port
cloudant_username | | Cloudant database username/API key
cloudant_password | | Cloudant database password
cloudant_httpclient.maxTotal | 200 | Cloudant http client max connections
cloudant_httpclient.maxPerRoute | 100 | Cloudant http client connections per route
cloudant_httpclient.soTimeout | 5000 | Cloudant http client socket timeout
cloudant_httpclient.connectionTimeout | 5000 | Cloudant http client connection timeout
cassandra_contactPoints||Cassandra contact points
cassandra_keyspace|acmeair_keyspace|Cassandra keyspace


* When running on Bluemix, datasource url will be read from bound service information.
* For Cloudant, you need to [follow instruction](document/DDL/cloudant.ddl) to create database and define search index.
* For Cassandra, you need to [follow instruction](document/DDL/cassandra.ddl) to create keyspace and tables.


### Configuration for Preload

Default values are defined [here](loader/loader-settings.json)

Name | Default | Meaning
--- |:---:| ---
MAX_CUSTOMERS | 10000 |  number of customers
MAX_DAYS_TO_SCHEDULE_FLIGHTS | 5 | max number of days to schedule flights
MAX_FLIGHTS_PER_DAY | 1 | max flights per day


## Other Topics

### How to extend with more datasource types

* Create a folder under dataaccess with the new dbtype name. Look at current implementation for reference.


### Data consistency with Acmeair Java

The data format is NOT the same as Acmeair Java. The impact:

* You can not share database with Acmeair Java. 
* When drive acmeair workload, you need follow the [instruction](https://github.com/acmeair/acmeair/wiki/jMeter-Workload-Instructions) to use -DusePureIDs=true when starting jmeter.
