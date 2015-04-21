var fs = require('fs');
var streamHandler = require('./streamHandler.js')

var settings = JSON.parse(fs.readFileSync('./netflix/hystrix.json', 'utf8'));
var refreshInterval = settings.hystrix.refreshInterval || 500;

var hystrixMetricsStreamHandlerFactory = this; // default to self
exports.setHystrixMetricsStreamHandlerFactory = function(handler){
	hystrixMetricsStreamHandlerFactory= handler;
}

exports.hystrixStream = function(request, response) {
	
	if (!hystrixMetricsStreamHandlerFactory)
	{
		response.send(503,{error:"hystrixMetricsStreamHandlerFactory not defined."});
		return;
	}

	console.log('setup hystrix stream with:' +refreshInterval +" ms");
	
	hystrixMetricsStreamHandlerFactory.getHystrixMetricsStreamHandler(refreshInterval, function(error, instance){
		if (!instance ){ 
			console.log("Can not get instance");
			response.send(503, {error: 'Can not get instance'});
        }else if (error){ 
            console.log("Get instance hit error:"+error);
            response.send(503, {error: error});
        }else {
             //End is never called now. Where else I can shutdown the instances which will the connection count???
			 request.on('end', function() {
				 console.log('receive request end');
                 instance.shutdown(function(){      }) 
			 });
            /* initialize response */
            response.setHeader("Content-Type", "text/event-stream;charset=UTF-8");
            response.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
            response.setHeader("Pragma", "no-cache");

 		    setInterval(function(){
			    instance.getJsonMessageAsString(function(err,jsonMessageStr){
				    if (err) {
				    	console.log("error:"+err);
						response.send(503,{error: err});
	                } else  {
						if (jsonMessageStr.length==0) {
	 		                response.write("ping: \n");
	       	         	} else {
	                  	    response.write(jsonMessageStr); // use write instead of send so the request is not ended
	               	    }
						// NodeJS http does not have a flushBuffer function
	                }
			    });
 		    },refreshInterval)
          }
    })
}

exports.getHystrixMetricsStreamHandler = function(refreshInterval, callback /*error, handler*/){
	
	streamHandler.getHandler(refreshInterval,callback);
}
