# Acme Air in NodeJS 

## Content

### Runtime Environment

[NodeJs](http://nodejs.org/download/)


### Datastore Choices

Environment variable dbtype is used to determine the datastore choice. See under "More on datastore".

datastore | dbtype value | Meaning
--- | --- | --- 
[MongoDB](https://www.mongodb.org/downloads) | mongo | The default choice. Assume started on localhost:27017
[Cloudant](https://cloudant.com) | cloudant | 


### Application Mode

Environment variable AUTH_Service is use to determine when Micro-Service is used.

application mode | AUTH_Service value | Meaning
--- | --- | --- 
Monolithic | | One NodeJS application. The default mode.
Micro-Service | host:port | Main NodeJS application delegates to authorization service NodeJS application hosted on host:port


### Application Run Platforms

* [Bluemix] (README_Bluemix.md)
* [Docker] (README_Docker.md)
* [Bluemix Container Service] (README_Bluemix_Container.md)


## How to get started

Assume MongoDB started on localhost:27017

### Resolve module dependencies

	npm install

### Run Acmeair in Monolithic on Local

	node app.js
		
		
### Run Acmeair in Micro-Service on Local

	node authservice-app.js
	set AUTH_SERVICE=localhost:9443 or export AUTH_SERVICE=localhost:9443
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
	
	
	
## More on datastore

### How dbtype is determined

* Set environment variable dbtype to mongo or cloudant to determine which dbtype to use. The default mongo. 
* When running on Bluemix, dbtype is automactially discovered from the service the application is bound to.


### Datastore Configuration for runtime

Default values are defined [here](settings.json)

Name | Default | Meaning
--- |:---:| ---
mongoHost | 127.0.0.1 | MongoDB host ip
mongoPort | 27017 | MongoDB port
mongoConnectionPoolSize | 10 | MongoDB connection pool size
cloudant_host| | Cloudant database url 
cloudant_username | | Cloudant database username/API key
cloudant_password | | Cloudant database password
cloudant_httpclient.maxTotal | 200 | Cloudant http client max connections
cloudant_httpclient.maxPerRoute | 100 | Cloudant http client connections per route
cloudant_httpclient.soTimeout | 5000 | Cloudant http client socket timeout
cloudant_httpclient.connectionTimeout | 5000 | Cloudant http client connection timeout

* When running on Bluemix, datasource url will be read from bound service information.
* For CLoudant, you need to [follow](document/DDL/cloudant.ddl) to create database and define search index.

### Configuration for preload datastore

Default values are defined [here](loader/loader-settings.json)

Name | Default | Meaning
--- |:---:| ---
MAX_CUSTOMERS | 10000 |  number of customers
MAX_DAYS_TO_SCHEDULE_FLIGHTS | 5 | max number of days to schedule flights
MAX_FLIGHTS_PER_DAY | 1 | max flights per day


### How to extend with more datasource types

* Create a folder under dataaccess with the new dbtype name. Look at current implementation for reference.


### Data consistency with Acmeair Java

The data format is NOT the same as Acmeair Java. The impact:

* You can not share database with Acmeair Java. 
* When drive [acmeair workload](ttps://github.com/acmeair/acmeair/wiki/jMeter-Workload-Instructions), you need follow the instruction to use -DusePureIDs=true when starting jmeter.
