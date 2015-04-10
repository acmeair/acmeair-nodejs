
FROM  ubuntu:14.04
MAINTAINER Yang Lei<yanglei@us.ibm.com>

# Describe the environment

ENV JMETER_VERSION 2.9
ENV JDK_VERSION 6

# Install the JDK
RUN apt-get update && apt-get install -y openjdk-$JDK_VERSION-jdk

ENV JAVA_HOME /usr/lib/jvm/java-$JDK_VERSION-openjdk-amd64

# Fetch and unpack JMeter

RUN apt-get install -y wget
RUN cd /var/lib && wget -q http://archive.apache.org/dist/jmeter/binaries/apache-jmeter-$JMETER_VERSION.tgz && tar zxf apache-jmeter-$JMETER_VERSION.tgz && rm -f apache-jmeter-$JMETER_VERSION.tgz 

# Add JMeter to the PATH
ENV PATH /var/lib/apache-jmeter-$JMETER_VERSION/bin:$PATH

# Add files needed by acmeair for jmeter

WORKDIR /var/workload/acmeair-nodejs/

ADD ./jmeter /var/workload/acmeair-nodejs/
RUN wget https://json-simple.googlecode.com/files/json-simple-1.1.1.jar

RUN \
	mv json-simple-1.1.1.jar /var/lib/apache-jmeter-$JMETER_VERSION/lib/ext/.;\
	cp ./lib/*.jar /var/lib/apache-jmeter-$JMETER_VERSION/lib/ext/.;\
	cp ./properties/*.properties /var/lib/apache-jmeter-$JMETER_VERSION/bin/.;\
	chmod 777 *.sh;

ENV NUM_THREAD 2
ENV LOOP_COUNT 10
ENV USE_PURE_IDS true
#ENV CONTEXT_ROOT 
#APP_PORT_9080_TCP_ADDR
#APP_PORT_9080_TCP_PORT

CMD ["./runWorkload.sh"]
