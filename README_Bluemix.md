## Acmeair NodeJS on Bluemix 

* Assume you have access to [Bluemix](https://console.ng.bluemix.net). 

	cf api api.ng.bluemix.net
	
	cf login

### Run Acmeair Container in Monolithic


#### Push Application

	cf push acmeair-nodejs --no-start -c "node app.js"
		

#### Create any one of the services
	   
* Mongo: 

	cf create-service mongodb 100 acmeairMongo
   			
* Cloudant:

	cf create-service cloudantNoSQLDB Shared acmeairCL

	Note: use the content from document/DDL/cloudant.ddl to create database and define search index 

#### Bind service to application
	
	cf bind-service acmeair-nodejs acmeairMongo
	
	or
	
	cf bind-service acmeair-nodejs acmeairCL


#### Start application and Access application URL
	
	cf start acmeair-nodejs
	
	http://acmeair-nodejs.mybluemix.net	
