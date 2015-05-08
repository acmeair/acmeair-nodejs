## Acmeair NodeJS on Bluemix 

Assume you have access to [Bluemix](https://console.ng.bluemix.net). 

	cf api api.ng.bluemix.net
	
	cf login

### Run Acmeair in Monolithic mode


#### Push Application

	cf push acmeair-nodejs --no-start -c "node app.js"

Note that "acmeair-nodejs" is the application name and will be used for the hostname of the application. It needs to be unique so many need to add an 

identifies to it to make it unique. You could use the initials of your name.
		

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

Again, "acmeair-authservice" needs to be unique.

#### Now that the authentication service is running, you can configure the web application to use it by setting the following user defined environment 

variable stopping the application first


	cf stop acmeair-nodejs
	cf set-env acmeair-nodejs AUTH_SERVICE acmeair-authservice.mybluemix.net:80

#### Enable Hystrix by setting the following user defined environment variable

	cf set-env acmeair-nodejs enableHystrix true

#### Now start the authentication service and the web application


	cf start acmeair-authservice
	cf start acmeair-nodejs

	Now go to http://acmeair-nodejs.mybluemix.net and login. That login uses the authentication microservice.

#### You can run the Hystrix Dashboard in Bluemix as well. To deploy the Hystrix dashboard, you need to download the WAR file for the dashboard. You
can find a link to the download here: https://github.com/Netflix/Hystrix/wiki/Dashboard#installing-the-dashboard. The following CF CLI command will deploy 

the Hystrix dashboard to Bluemix:

	cf push acmeair-hystrix -p hystrix-dashboard-1.4.5.war

At the time of this writing, the latest version of the WAR file was 1.4.5. Make sure you get the latest version. Note that as before, "acmeair-hystrix" needs 

to be unique. The WAR file will get deployed to the Liberty for Java runtime in Bluemix. Once the hystrix dashboard app is running, you will be able to 

access the dashboard using the following route:

	http://acmeair-hystrix.mybluemix.net

To monitor the Acme Air authentication service, you need to monitor the following hystrix event stream:

	http://acmeair-nodejs.mybluemix.net/rest/api/hystrix.stream

Specify that stream on the Hystrix Dashboard home page and click the Monitor.
