## Acmeair NodeJS on Bluemix Container Service 


* Assume you have obtained Container Service on from [Bluemix](https://console.ng.bluemix.net). 

	The service defines <API key> and Registry URL, e.g: registry-ice.ng.bluemix.net/acmeair. 

* Assume you have created  Acmeair Image by [instructions] (README_Docker.md)


###  Register your docker image to the service registry url 

	docker login -u any -p <API key> -e a@b.c registry-ice.ng.bluemix.net
	
	docker tag acmeair/web registry-ice.ng.bluemix.net/acmeair/acmeair_web
	docker push registry-ice.ng.bluemix.net/acmeair/acmeair_web
	
	docker tag mongo registry-ice.ng.bluemix.net/acmeair/mongo
	docker push registry-ice.ng.bluemix.net/acmeair/mongo


### Start docker containers using ice 

please see instructions of the container service page on how to install ice-cli

	ice login -k <API key> -H https://api-ice.ng.bluemix.net/v1.0/containers -R registry-ice.ng.bluemix.net
	
	ice images 
		to show the pushed images
		
	ice ps
		to show containers


#### Run MongoDB Container

	ice run --name mongo_001 registry-ice.ng.bluemix.net/acmeair/mongo
	
	ice ps  
		until the container is in RUNNING status to get private ip,  e.g. 172.16.65.60


#### Run Acmeair Container in Monolithic


	ice run --name acmeair_web_001 -e MONGO_URL=mongodb://172.16.65.60:27017/acmeair registry-ice.ng.bluemix.net/acmeair/acmeair_web
	

#### Run Acmeair Container in Micro-Service

	ice run --name acmeair_web_002 -e APP_NAME=authservice_app.js -e MONGO_URL=mongodb://172.16.65.60:27017/acmeair registry-ice.ng.bluemix.net/acmeair/acmeair_web
	
	ice ps  
		until the container is in RUNNING status to get private ip,  e.g. 172.16.65.54
	
	ice run --name acmeair_web_003 -e AUTH_SERVICE=172.16.65.54:9443 -e MONGO_URL=mongodb://172.16.65.60:27017/acmeair registry-ice.ng.bluemix.net/acmeair/acmeair_web
		
		
### Bind Public IP and Access Application URL

	ice ip request   
		get public ip, e.g. 129.41.248.57, 129.41.248.58

	ice ip list
		show all available floating ip

	ice ip bind 129.41.248.58 acmeair_web_001
	ice ip bind 129.41.248.57 acmeair_web_003

	access application url
		http://129.41.248.57:9080
		http://129.41.248.58:9080
	
#### Note:

* You may hit some failures during login until it is successful. It is due to the network from container to outside world may take longer time to setup.
