# Acme Air in NodeJS 

## Content

### Datasource Choices

* MongoDB 
* Cloudant

#### Note

* Use environment virable dbtype=mongo or dbtype=cloudant to determine which data type to use. 
* When running on Bluemix, dbtype is automactially discovered from the service the application is bound to.
* All database configuration is defined in settings.json. 
* To extend with new datasources types, create a folder under dataaccess. Look at current implementation for details


### Application Flavors

* Monolithic 
* Micro-Service

Use AUTH_SERVICE=host name:port to point to the authentication micro-service.


### Application Run Platforms

* [Bluemix] (README_Bluemix.md)
* [Docker] (README_Docker.md)
* [Bluemix Container Service] (README_Bluemix_Container.md)



## How to get started

### Resolve module dependencies

	npm install


### Run Monolithic on Local

	node app.js
		
		
### Run Micro-Service on Local

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
	
