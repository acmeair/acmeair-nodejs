var fs = require('fs');
var CircuitBreaker = require('circuit-breaker') //npm install circuit-breaker
var Metrix = require('./metrix.js')

var settings = JSON.parse(fs.readFileSync('./netflix/hystrix.json', 'utf8'));
var defaultOption ={MAX_FAILURES:5,CALL_TIMEOUT_MS :10000, RESET_TIMEOUT_MS:60000}

global.AllCommands = {};
var getCommand = function (name, theWork,callback/*error, command*/){
	if (!AllCommands[name] )
	{
		// Need to enable per command name configuration later
		var maxFailures = settings.hystrix.circuitBreaker.maxFailures || defaultOption.MAX_FAILURES;
		var callTimeout = settings.hystrix.circuitBreaker.callTimeoutInMilliseconds || defaultOption.CALL_TIMEOUT_MS;
		var resetTimeout = settings.hystrix.circuitBreaker.resetTimeoutInMilliseconds || defaultOption.RESET_TIMEOUT_MS;
		
		AllCommands[name] = new Command(name,theWork, maxFailures, callTimeout, resetTimeout);
	}
	callback (null, AllCommands[name] )
}
exports.getCommand = getCommand;

exports.getInstance = function(name){ return AllCommands[name]}; // 

var Command = function(name, theWork,maxFailures, callTimeout, resetTimeout)
  {
	 this.name = name;
	 this.maxFailures = maxFailures;
	 this.callTimeout = callTimeout;
	 this.resetTimeout = resetTimeout;
     this.theWork = CircuitBreaker.new_circuit_breaker(theWork, maxFailures, callTimeout, resetTimeout)
     this.isCircuitOpen = false;
  }
      
Command.prototype.execute = function(){
	 var callbackIndex = arguments.length-1;
	 var origCallback = arguments[callbackIndex];  // Swap the callback to intercept the response and integrate with metrix

	 var before = new Date().getTime();
	 var cmd = this;
	 
	 arguments[callbackIndex] = function (error, result){
		 var responseTime = new Date().getTime() - before;
		 cmd.isCircuitOpen = (error==null)? false: ( error instanceof CircuitBreaker.CircuitBreakerError);
		 var isTimeout =  (error==null)?false: (error instanceof CircuitBreaker.TimeoutError);
		 Metrix.getInstance(cmd.name).push(responseTime , (error!=null), cmd.isCircuitOpen, isTimeout)
		 origCallback(error, result);
	 }
	 this.theWork.apply(this, arguments);
};
