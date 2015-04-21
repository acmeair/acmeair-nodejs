var fs = require('fs');
var stats = require("stats-lite") // npm install stats-lite

var settings = JSON.parse(fs.readFileSync('./netflix/hystrix.json', 'utf8'));
var rollingStatisticalWindowInMilliseconds = settings.hystrix.rollingStatisticalWindowInMilliseconds || 5000;
exports.rollingStatisticalWindowInMilliseconds =  rollingStatisticalWindowInMilliseconds;

var bucketSizeInMilliseconds =500; //create a bigger bucket;

var getBucket = function(ts) { return Math.ceil(ts/bucketSizeInMilliseconds)};
var bucketLength = getBucket(rollingStatisticalWindowInMilliseconds);
var allowedBucketLength = bucketLength *2; // Allow bigger bucket size than window to reduce array process

global.metrixInstances = {};

var getInstance =  function(name){
	metrixInstances[name] = metrixInstances[name] ||new Metrix(name);
	return metrixInstances[name];
}
exports.getInstance = getInstance;

var getInstances = function(){
	var instances = [];
	Object.keys(metrixInstances).forEach(function (key) {
	    var value = metrixInstances[key];
	    instances.push(value);
	});
	return instances;
}
exports.getInstances = getInstances;

function Metrix(name, g) {
  this.name = name;
  this.group = g || "default";
  this.data = [];
  this.error = [];
  this.circuitOpen = [];
  this.timeout = [];
  this.ts = [];
  this.statistics={}; // { bucket:, statistics:{total: , mean:, stddev:,percentile:{"0":, "25":,"50":,"75":,"90":,"95":,"99": ,"99.5":,"100":}}}
};

Metrix.prototype.showData = function () { console.log(this.name, this.group, this.ts, JSON.stringify(this.data)) , this.error, this.circuitOpen, this.timeout};

Metrix.prototype.getStatistics = function (callback /* error, result*/) {
	var ms = new Date().getTime();
	var bucket = getBucket(ms) -1 ; // Do not want to use the current bucket as it is not complete
	
	var index = this.ts.length-1;
	if (index<0) // no data
	{
		this.statistics = {bucket: bucket, statistics: {total: 0, error:0, errorRate:0, totalCircuitOpen: 0, totalTimeout:0, mean:0, stddev:0, percentile: {"0":0, "25":0,"50":0,"75":0,"90":0,"95":0,"99":0 ,"99.5":0,"100":0}}};
		callback(null, this.statistics);
		return;
	}

	if (this.statistics && this.statistics.bucket == bucket ) // the last calculated one is the current one
	{
		callback(null, this.statistics);
		return;
	}

	// Now need to calculate new value
	var totalList = [];
	var totalError = 0;
	var totalCircuitOpen =0;
	var totalTimeout = 0;
	
	for (var i = index; i>=0 && this.ts[i]>bucket-bucketLength; i--)
	{
		totalList = totalList.concat(this.data[i]);
		totalError += this.error[i];
		totalCircuitOpen += this.circuitOpen[i];
		totalTimeout += this.timeout[i];
	}
	if (totalList.length==0) // no data
	{
		this.statistics = {bucket: bucket, statistics: {total: 0, error:0, errorRate:0, totalCircuitOpen: 0, totalTimeout:0, mean:0, stddev:0, percentile: {"0":0, "25":0,"50":0,"75":0,"90":0,"95":0,"99":0 ,"99.5":0,"100":0}}};
		callback(null, this.statistics);
		return;
	}

	var errorRate = totalError / totalList.length;
	this.statistics = {"bucket": bucket, "statistics": {"total": totalList.length, "error": totalError, "errorRate": errorRate, "totalCircuitOpen": totalCircuitOpen, "totalTimeout":totalTimeout, "mean": stats.mean(totalList), "stddev": stats.stdev(totalList),
		percentile:{"0":stats.percentile(totalList, 0), "25":stats.percentile(totalList, 0.25),"50":stats.percentile(totalList, 0.5),
					"75":stats.percentile(totalList, 0.75),"90":stats.percentile(totalList, 0.9),"95":stats.percentile(totalList, 0.95),
					"99":stats.percentile(totalList, 0.99) || 0,"99.5":stats.percentile(totalList, 0.995) ||0,"100":stats.percentile(totalList, 1) ||0}}}
	
	//console.log("calculate",this.statistics); 
	callback(null, this.statistics);
};


Metrix.prototype.push = function (item, isError, isCircuitOpen, isTimeout) {  
	var ms = new Date().getTime();
	var bucket = getBucket(ms);
	
	var index = this.ts.length-1;
	if (index<0 || this.ts[index] != bucket) // the last item is not the current bucket
	{
		index++;
		this.ts.push(bucket);
		this.data.push([]);
		this.error.push(0);
		this.circuitOpen.push(0);
		this.timeout.push(0);
	}
	this.data[index].push(item);
	if (isError)
	{
		this.error[index] +=1;
		if (isCircuitOpen) this.circuitOpen[index] +=1;
		if (isTimeout) this.timeout[index] +=1;
	}

	housekeeping(bucket, this);
};

function housekeeping(bucket, metrix)
{
	var total = metrix.ts.length;
	if (total > allowedBucketLength) 
	{
		for (var i = 0; i < total; i++) {
			if (metrix.ts[i]>=bucket-bucketLength) // fall into the rolling window
			{
				if (i>0) // remove the [0 ,i-1] item
				{
					metrix.ts = metrix.ts.slice(i, total )
					metrix.data = metrix.data.slice(i,total)
					metrix.error = metrix.error.slice(i,total)
					metrix.circuitOpen = metrix.circuitOpen.slice(i,total)
					metrix.timeout = metrix.timeout.slice(i,total)
					return;
				}
			}
		}
	}

}
