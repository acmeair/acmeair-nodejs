var fs = require('fs');
var metrix = require('./metrix.js');
var command = require('./command.js');

var settings = JSON.parse(fs.readFileSync('./netflix/hystrix.json', 'utf8'));
var streamMaxConn = settings.hystrix.stream.maxConcurrentConnections || 5;

global.concurrentConnections = 0;

var getHandler = function (delay, callback /*error, handler*/){
	if (concurrentConnections>=streamMaxConn)
	{
		callback("MaxConcurrentConnections reached:"+streamMaxConn);
		return;
	}
	concurrentConnections +=1;
	callback(null, new StreamHandler(delay));
};
exports.getHandler= getHandler;

function StreamHandler(delay) {
  this.data = [];
  var handler = this;
  this.timerID = setInterval(function(){
     pollFromMetrix(handler);
  }, delay);
};

StreamHandler.prototype.shutdown = function(){  
	concurrentConnections -=1;
	clearInterval(this.timerID);
};

StreamHandler.prototype.getJsonMessageAsString = function(callback /*err,jsonMessageStr*/){
	var sb = "";
	for (var i in this.data)
		sb +=  "data: " +  this.data[i] + "\n\n";
	this.data = [];// Should drain the current queue
	//console.log("getJsonMessageAsString", sb);
	callback(null, sb); 
}

StreamHandler.prototype.handleJsonMetric = function(item){
	this.data.push(item);
}

var pollFromMetrix = function(handler){
	
	var list = metrix.getInstances();
	for (var i in list)
	{
	    var json = {};
	    var item = list[i];
        item.getStatistics(function (error, result){
        	if (error ) console.log(error);
        	else{
        		info = result.statistics;
	    
		        json.type = "HystrixCommand"; 
		        json.name =  item.name;
		        json.group = item.group;
		        json.currentTime = new Date().getTime();
		
		        var circuitBreaker = command.getInstance(item.name);
		        if (!circuitBreaker) {
		            json.isCircuitBreakerOpen =false;
		        } else {
		            json.isCircuitBreakerOpen = circuitBreaker.isCircuitOpen;
		        }
	        
		        json.errorPercentage =  info.errorRate;
		        json.errorCount =  info.error;
		        json.requestCount = info.total;
		
		        // rolling counters.  TBD
		        json.rollingCountCollapsedRequests = 0;
		        json.rollingCountExceptionsThrown = 0;
		        json.rollingCountFailure = info.error;
		        json.rollingCountFallbackFailure = 0;
		        json.rollingCountFallbackRejection = 0;
		        json.rollingCountFallbackSuccess = 0;
		        json.rollingCountResponsesFromCache = 0;
		        json.rollingCountSemaphoreRejected = 0;
		        json.rollingCountShortCircuited = info.totalCircuitOpen;
		        json.rollingCountSuccess = info.total;
		        json.rollingCountThreadPoolRejected = 0;
		        json.rollingCountTimeout = info.totalTimeout;
		
		        json.currentConcurrentExecutionCount =0; // TBD
		
		        // latency percentiles.
		        json.latencyExecute_mean= info.mean;
		        json.latencyExecute = info.percentile;
		
		        json.latencyTotal_mean = info.mean
		        json.latencyTotal = info.percentile;
		
		        json.propertyValue_circuitBreakerRequestVolumeThreshold = 0; 
		        json.propertyValue_circuitBreakerSleepWindowInMilliseconds = (circuitBreaker ==null)? 0:circuitBreaker.resetTimeout ; 
		        json.propertyValue_circuitBreakerErrorThresholdPercentage =0;
		        json.propertyValue_circuitBreakerForceOpen = false;
		        json.propertyValue_circuitBreakerForceClosed = false;
		        json.propertyValue_circuitBreakerEnabled = (circuitBreaker !=null);
		        json.propertyValue_executionIsolationStrategy = "unknown";
		        json.propertyValue_executionIsolationThreadTimeoutInMilliseconds = (circuitBreaker ==null)? 0:circuitBreaker.callTimeout ;
		        json.propertyValue_executionIsolationThreadInterruptOnTimeout =0;
		        json.propertyValue_executionIsolationThreadPoolKeyOverride = false;
		        json.propertyValue_executionIsolationSemaphoreMaxConcurrentRequests =0;
		        json.propertyValue_fallbackIsolationSemaphoreMaxConcurrentRequests = 0;
		
		        json.propertyValue_metricsRollingStatisticalWindowInMilliseconds = metrix.rollingStatisticalWindowInMilliseconds;
		
		        json.propertyValue_requestCacheEnabled = false;
		        json.propertyValue_requestLogEnabled = false;
		
		        json.reportingHosts =  1;
		        
		        handler.handleJsonMetric(JSON.stringify(json));
	        	}
	    })
	}
}