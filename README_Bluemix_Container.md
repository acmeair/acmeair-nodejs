## Acmeair NodeJS on Bluemix Container Service 


* Assume you have obtained Container Service on from [Bluemix](https://console.ng.bluemix.net). 

	The service defines <API key> and Registry URL, e.g: registry-ice.ng.bluemix.net/acmeair. 

* Assume you have created  Acmeair Image by [following] (README_Docker.md)


###  Register your docker image to the service registry url 

	docker login -u any -p <API key> -e a@b.c registry-ice.ng.bluemix.net
	
	docker tag acmeair/web registry-ice.ng.bluemix.net/acmeair/acmeair_web
	docker push registry-ice.ng.bluemix.net/acmeair/acmeair_web
	
	docker tag mongo registry-ice.ng.bluemix.net/acmeair/mongo
	docker push registry-ice.ng.bluemix.net/acmeair/mongo


### Start docker containers using ice (please see instructions of the container service page on how to install ice-cli)

	ice login -k <API key> -H https://api-ice.ng.bluemix.net/v1.0/containers -R registry-ice.ng.bluemix.net
	
	ice images 
		to show the pushed images
		
	ice ps
		to show containers

	ice run --name mongo_001 registry-ice.ng.bluemix.net/acmeair/mongo
	
	ice ps  
		until the container is in RUNNING status to get private ip,  e.g. 172.16.65.60

	ice run --name acmeair_web_001 -e MONGO_URL=mongodb://172.16.65.60:27017/acmeair registry-ice.ng.bluemix.net/acmeair/acmeair_web
	
	ice ip request   
		get public ip, e.g. 129.41.248.58    

	ice ip list
		show all available floating ip

	ice ip bind 129.41.248.58 acmeair_web_001

	access application url
		http://129.41.248.58:9080
	
