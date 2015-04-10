## Acmeair NodeJS on Docker 


Assume you have [installed Docker and stared Docker daemon](https://docs.docker.com/installation/)

### Run MongoDB container

	docker run --name mongo_001 -d -P mongo
	
	docker ps
		to get mapped port of 27017, e.g. 49177 

### Create a docker image for Acmeair and run Acmeair container

	docker build -t acmeair/web .
	

#### Run Acmeair Container in Monolithic

	docker run -d -P --name acmeair_web_001 --link mongo_001:mongo acmeair/web 
	
	or use the MONGO_URL location e.g.
	
	docker run -d -P --name acmeair_web_002 -e MONGO_URL=mongodb://192.168.59.103:49177/acmeair acmeair/web 
	
		
#### Run Acmeair Containers in Micro-Service

	docker run -d -P --name acmeair_web_003 -e APP_NAME=authservice_app.js --link mongo_001:mongo acmeair/web 
	
	docker ps
		to get mapped port for 9443 , e.g. 49187
		
	docker run -d -P --name acmeair_web_004 -e AUTH_SERVICE=192.168.59.103:49187 --link mongo_001:mongo acmeair/web 

	or use the MONGO_URL location as above


#### Get application port

	docker ps
		get the mapped port for 9080 to get the application url. e.g. http://192.168.59.103:49178

#### Note:

* For Cloudant, you can use CLOUDANT_URL for datasource location


## Run Jmeter workload on Docker 

### Create a docker image for Jmeter workload

	docker build -t acmeair/workload document/workload

### Run Jmeter workload against a Acme Air runtime

	docker run -i -t -e APP_PORT_9080_TCP_ADDR=<the ip> -e APP_PORT_9080_TCP_PORT=<the port> acmeair/workload
	
	or
	
	docker run -i -t --link acmeair_web_001:app acmeair/workload
	
