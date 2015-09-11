/*******************************************************************************
* Copyright (c) 2015 IBM Corp.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*******************************************************************************/
// Dataaccess must implement 
//	 	dbNames:  { customerName:, flightName:, flightSegmentName:, bookingName:, customerServiceName:, airportCodeMappingName:}
// 		initializeDatabaseConnections(function(error))
// 		insertOne(collname, doc, function(error, doc))
// 		findOne(collname, _id value, function(error, doc))
//		update(collname, doc, function(error, doc))
//		remove(collname, condition as json of field and value, function(error))
// 		findBy(collname, condition as json of field and value,function(err, docs))


module.exports = function (settings) {
    var module = {};

	var rest = require('./rest')
	  , url = require('url')
	  , http = require('http')
	  , stream = require('stream')
	  , log4js = require('log4js');	
	var logger = log4js.getLogger('dataaccess/wcf');
	logger.setLevel(settings.loggerLevel);

	module.dbNames = {
		customerName: "customer",
		flightName:"flight",
		flightSegmentName:"flightSegment",
		bookingName:"booking",
		customerSessionName:"customerSession",
		airportCodeMappingName:"airportCodeMapping"
	}

	var dbConfig = calculateDBConfig();
	
	function calculateDBConfig(){		
		var dbConfig ;
		if(process.env.VCAP_SERVICES){
			var env = JSON.parse(process.env.VCAP_SERVICES);
	        logger.log("env: %j",env);
			var serviceKey = Object.keys(env)[0];
			dbConfig = env[serviceKey][0]['credentials'];
		}
		if ( ! dbConfig ) {
			dbConfig = {
		    "restResource":settings.wcfds_rest_url,
		    "username":settings.wcfds_username,
		    "password":settings.wcfds_password
		    }
		}
		dbConfig.auth = 'Basic '
		    + new Buffer(dbConfig.username + ':' + dbConfig.password)
        	.toString('base64');
		var p = url.parse(dbConfig.restResource);
		dbConfig.baseUrl = 'http://' + p.hostname;
		dbConfig.pathname = p.pathname;
		
		logger.info("WCF Data Services config:"+JSON.stringify(dbConfig));
		return dbConfig;
	}
	
	module.initializeDatabaseConnections = function(callback/*(error)*/) {
		//do nothing
		callback(null);
	};
	
	module.insertOne = function (collectionname, doc, callback /* (error, doc) */) {
		logger.debug('>> WCFDS insertOne')
		var headers = {
			'Content-Type' : 'application/json',
			'Authorization' : dbConfig.auth
		};
		
		var options = {
			rejectUnauthorized : false,
			agent : false
		};
		
		var resource = dbConfig.pathname + '/' + encodeURIComponent(collectionname) +
			encodeURIComponent(doc._id);
		
		rest.post(dbConfig.baseUrl, resource, headers, options, doc, function(res) {
			logger.debug('<< WCFDS insertOne value sent. Response from the WCFDS server: ', res);
	        callback && res instanceof Error ? callback(res): callback();
	    });
	};
	
	module.findOne = function (collectionname, key, callback /* (error, doc) */) {
		logger.debug('>> WCFDS findOne')
		var headers = {
			'Accept' : 'application/json',
			'Authorization' : dbConfig.auth
		};
		
		var options = {
			rejectUnauthorized : false,
			agent : false
		};
		
		var resource = dbConfig.pathname + '/' + encodeURIComponent(collectionname) +
			encodeURIComponent(key);
		
		rest.get(dbConfig.baseUrl, resource, headers, options, function(res) {
			logger.debug('<< WCFDS findOne value received. Response from the WCFDS server: ', res);
	        callback && res instanceof Error ? callback(res): callback();
	    });
	};
	
	module.update = function (collectionname, doc, callback /* (error, insertedDocument) */) {
		logger.debug('>> WCFDS update')
		var headers = {
			'Content-Type' : 'application/json',
			'Authorization' : dbConfig.auth
		};
		
		var options = {
			rejectUnauthorized : false,
			agent : false
		};
		
		var resource = dbConfig.pathname + '/' + encodeURIComponent(collectionname) +
			encodeURIComponent(doc._id);
		
		rest.put(dbConfig.baseUrl, resource, headers, options, doc, function(res) {
			logger.debug('<< WCFDS update value sent. Response from the WCFDS server: ', res);
	        callback && res instanceof Error ? callback(res): callback();
	    });
	};
	
	 module.remove = function (collectionname, condition, callback /* (error) */) {
		 logger.debug('>> WCFDS remove')
			var headers = {
				'Accept' : 'application/json',
				'Authorization' : dbConfig.auth
			};
			
			var options = {
				rejectUnauthorized : false,
				agent : false
			};
			
			var resource = dbConfig.pathname + '/' + encodeURIComponent(collectionname) +
				encodeURIComponent(key);
			
			rest.del(dbConfig.baseUrl, resource, headers, options, function(res) {
				logger.debug('<< WCFDS remove value removed. Response from the WCFDS server: ', res);
		        callback && res instanceof Error ? callback(res): callback();
		    });
	 };
	 
	 module.findBy = function(collectionname, condition, callback /*(error, docs*/){
		 
	 };
	
	return module;

}