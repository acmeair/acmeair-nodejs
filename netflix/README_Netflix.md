The following describes how to use Netflix OSS technology to interact with a "micro-service", AuthurizationService , for session creation, session validation, session invalidation.

The work has only been verified outside bluemix.

Assumption: 

	Already started eureka server ( default to localhost:8080)
	Already registered the "micro-service" ACMEAIR-AUTH-Service with eureka server . There are two ways:
	1. cd netflix/authservice
	   npm install
	   node app.js
	or 2. start the Java AuthService. (https://svn.opensource.ibm.com/svn/scale/temp-projects/acmeair-cloudoe-netflix)

	For monitoring using Hystrix and Turbine

		Started hystrix at: http://localhost:7979/hystrix-dashboard (using ..\gradlew jettyRun)
		Started hystrix at: http://localhost:8080/turbine-web ( as a war)

		Add your edge application url to hystrix-dashboard:
				http://localhost:9980/acmeair-webapp/hystrix.stream ( the java version)
				http://localhost:9080/rest/api/hystrix.stream ( the nodejs version)
				http://localhost:8080/turbine-web/turbine.stream?cluster=default (turbine already configured with discovery of acmeair)


	please refer to the follow for details on how to setup the remote micro service (written in java)
		svn co https://svn.opensource.ibm.com/svn/scale/temp-projects/acmeair-cloudoe-netflix


NodeJS and NetflixOSS.

	You can choose between Java v.s. Http approach by "set authService=acmeaircmd" or "set authService=acmeairhttp" 
	
	npm install 
		will install all things except node-java, which is only needed by "authService=acmeaircmd" 
		
	node app.js

Java Approach:
--------------------

set authService=acmeaircmd

1. Use node-java

	npm install java@0.2.5 ( the latest 0.4.2 has issue)

	When running on windows, depends on: 1) install Visual Studio 2012 Express for Windows Desktop - English,   
										 2) set JAVA_HOME 
										 3) set PATH to include: %JAVA_HOME%\jre\bin\default
										 4) python 2.7


2. Prepare external dependencies due to Netflix OSS. (all jars under ext-lib)

acmeair-common-1.0-SNAPSHOT.jar
	contains the acmeair entity model. Built from acmeair java version

acmeairHystrixCmd.jar
	contains the hystrix command to interact with authorization micro-service. Extracted from acmeair java version
	
acmeairHystrixCmdUtil-1.0-SNAPSHOT.jar 
	contains the code for the following:
		Bootstrap using KaryonServer and shutdown
		Simplify hystrix command call from nodejs on createSession/validateSession/invalidateSession by wrapping in a util class
		Hystrix stream implementation
		HealthCheck class.
		
	the source code is under acmeairHystrixCmdUtil, use "mvn clean compare package" to build.
		you need to install the 2 jars if they are not previously built/installed
		
		mvn install:install-file -Dfile=acmeairHystrixCmd.jar -DgroupId=com.acmeair -DartifactId=acmeairHystrixCmd -Dversion=1.0-SNAPSHOT -Dpackaging=jar
		mvn install:install-file -Dfile=acmeair-common-1.0-SNAPSHOT.jar -DgroupId=com.acmeair -DartifactId=acmeair-common -Dversion=1.0-SNAPSHOT -Dpackaging=jar
		
	During the build, all dependent jars ( including the above 2) will be copied under ext-lib/target/lib and used by runtime. 
		You will need to copy the built acmeairHystrixCmdUtil-1.0-SNAPSHOT.jar to replace the current one.
	
	If you do not want to build above, you can also issue mvn package from netfix/ext-lib , which will gerenate the dependent jars w/o the above 2 under target/lib

3. acmeaircmd\index.js contains the authorization code 

	Verified the following works: 
		1) eureka server registry, 
		2) heart-beat, 
		3) karyon health check
		4) ribbon http with round robin load balancing
		5) hystrix command with circuit breaker
		6) hystrix dashboard with application hystrix stream and aggregated turbine stream

4. Some thoughts on CF 

	Dependencies on JAVA_HOME

5. Code reuse with Java version Acmeair thoughts

	New bootstrapping code is created from the one in Acmeair Java project as we need to remove dependencies to HTTP


Http Approach:
----------------------------

set authService=acmeairhttp

1. Use stats-lite for metrix (percentile)

	npm install stats-lite

2. Use circuit-breaker for fail fast

	npm install circuit-breaker
		
3. acmeairhttp\index.js contains the authorization code 

	Verified 1) eureka server registry, 
		     2) heart-beat, 
		     3) health check
		     4) round robin load balancing, 
		     5) hystrix dashboard with application hystrix stream and aggregated turbine stream
			 6) fail fast with circuit breaker and integration with hystrix stream


==================================================================================================================

To run the application on docker for HTTP approach

1. setup docker sever on ubuntu ( The same as in root README)

http://docs.docker.com/installation/ubuntulinux/

2.  git clone the project onto the docker server and change to the project root directory ( The same as root README)

3.  Create a docker image for mongodb from Dockerfile: acmeair/db  ( The same as root README)
   	build: docker build -t acmeair/db document/Dockerfile/mongodb
	run: docker run --name mongo_001 -d -P acmeair/db
	check log:  docker logs mongo_001
	verify :
		get the mapped port:  docker ps
		mongo -port < the above port>

4. Create a docker image for nodejs edge service  from Dockerfile, "acmeair/nodejs" ( The same as root README)
	build: docker build -t acmeair/nodejs document/Dockerfile/nodejs 
	verify:  docker run -i -t acmeair/nodejs /bin/bash


5. Create a docker image and container for Eureka from Dockerfile, "acmeair/eureka" | acmeair_eureka_001
	build: docker build -t acmeair/tomcat7 document/Dockerfile/tomcat
		verify :  docker run -i -t acmeair/tomcat7 /bin/bash
	docker build -t acmeair/git_gradle document/Dockerfile/git_gradle
		verify :  docker run -i -t acmeair/git_gradle /bin/bash
	docker build -t acmeair/eureka document/Dockerfile/eureka
		verify :  docker run -i -t acmeair/eureka /bin/bash
	run :  docker run -d -P --name acmeair_eureka_001 acmeair/eureka

		Eureka console at : http://<eureka server ip>:<application mapped port>/eureka

6. Create docker image and container for acmeair edge v.s. micro service 
	build: docker build -t acmeair/web .	( The same as root README)
		verify :  docker run -i -t acmeair/web /bin/bash
	run:   docker run -d -P -e "authService=acmeairhttp" --name acmeair_web_edge_001 --link mongo_001:db --link acmeair_eureka_001:eureka acmeair/web

	docker build -t acmeair/authservice netflix/authservice
	run:   docker run -d -P --name acmeair_authservice_001 --link mongo_001:db --link acmeair_eureka_001:eureka acmeair/authservice

7. Run the application!
	http://<docker server ip>:<application mapped port>

