## Acmeair NodeJS on Bluemix 

Assume you have access to [Bluemix](https://console.ng.bluemix.net). 

	cf api api.ng.bluemix.net
	
	cf login

### Run Acmeair in Monolithic mode


#### Push Application

	cf push acmeair-nodejs --no-start -c "node app.js"
		

#### Create any one of the services
	   
Mongo: 

	cf create-service mongodb 100 acmeairMongo
   			
Cloudant:

	cf create-service cloudantNoSQLDB Shared acmeairCL

	Note: use the content from document/DDL/cloudant.ddl to create database and define search index 

#### Bind service to application
	
	cf bind-service acmeair-nodejs acmeairMongo
	
	or
	
	cf bind-service acmeair-nodejs acmeairCL


#### Start application and Access application URL
	
	cf start acmeair-nodejs
	
	http://acmeair-nodejs.mybluemix.net	


### Run Acmeair in Microservices mode

#### You must first deploy the Acmeair in Monolithic mode before proceeding.

#### Push the authentication service

	cf push acmeair-authservice --no-start -c "node authservice-app.js"

#### Now that the authentication service is running, you can configure the web application to use it by setting the following user defined environment variable stopping the application first


	cf stop acmeair-nodejs
	cf set-env acmeair-nodejs AUTH_SERVICE acmeair-authservice.mybluemix.net:80

#### Enable Hystrix by setting the following user defined environment variable

	cf set-env acmeair-nodejs enableHystrix true

#### Now start the authentication service and the web application


	cf start acmeair-authservice
	cf start acmeair-nodejs

	Now go to http://acmeair-nodejs.mybluemix.net and login. That login uses the authentication microservice.
