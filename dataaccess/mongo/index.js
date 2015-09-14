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
//		count(collname, condition as json of field and value, function(error, count))

module.exports = function (settings) {
    var module = {};

	var mongodb = require('mongodb');
	var log4js = require('log4js');
	
	var logger = log4js.getLogger('dataaccess/mongo');
	logger.setLevel(settings.loggerLevel);

	module.dbNames = {
		customerName: "customer",
		flightName:"flight",
		flightSegmentName:"flightSegment",
		bookingName:"booking",
		customerSessionName:"customerSession",
		airportCodeMappingName:"airportCodeMapping"
	}

	var dbclient = null;

	module.initializeDatabaseConnections = function(callback/*(error)*/) {
	    var mongo = null;
		var mongoURI = null;
		if(process.env.VCAP_SERVICES){
			  var env = JSON.parse(process.env.VCAP_SERVICES);
	             logger.info("env: %j",env);
			  var serviceKey = Object.keys(env)[0];
			  if (serviceKey)
	          {
				  mongo = env[serviceKey][0]['credentials'];                 
	     		  logger.info("mongo: %j",mongo);
			  }
		}

		// The section is for docker integration using link
		if (mongo ==null && process.env.MONGO_PORT!=null) {
	        logger.info(process.env.MONGO_PORT);
	        logger.info(process.env.MONGO_PORT_27017_TCP_ADDR);
	        logger.info(process.env.MONGO_PORT_27017_TCP_PORT);
		    mongo = {
			    "hostname":  process.env.MONGO_PORT_27017_TCP_ADDR,
			    "port": process.env.MONGO_PORT_27017_TCP_PORT,
			    "username":"",
			    "password":"",
			    "name":"",
			    "db":"acmeair"
		    }
		}
		// Default to read from settings file
		if (mongo==null) {
		    mongo = {
		    "hostname": settings.mongoHost,
		    "port": settings.mongoPort,
		    "username":"",
		    "password":"",
		    "name":"",
		    "db":"acmeair"
		 }
		}
		
		var generate_mongo_url = function(obj){
			if (process.env.MONGO_URL)
			{
			  logger.info("mongo: %j",process.env.MONGO_URL);
			  return process.env.MONGO_URL;
			}
	        if (obj['uri']!=null)
	        {
	        	return obj.uri;
	        }
	        if (obj['url']!=null)
	        {
	        	return obj.url;
	        }
			obj.hostname = (obj.hostname || 'localhost');
			obj.port = (obj.port || 27017);
			obj.db = (obj.db || 'acmeair');

			if(obj.username && obj.password){
				return "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db;
			}
			else{
		        return "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db;
	  	 	}
		}

		var mongourl = generate_mongo_url(mongo);
		
		var c_opt = {server:{auto_reconnect:true,poolSize: settings.mongoConnectionPoolSize}};
	    mongodb.connect(mongourl, c_opt, function(err, conn){
	             if (err){
	                callback(err);
	             }else {
	             dbclient=conn;
	             // Add ensureIndex here
	             dbclient.ensureIndex(module.dbNames.bookingName, {customerId:1}
	             , {background:true}, function(err, indexName) {
	            	 logger.info("ensureIndex:"+err+":"+indexName);
	             });
	             dbclient.ensureIndex(module.dbNames.flightName, {flightSegmentId:1,scheduledDepartureTime:2}
	             , {background:true}, function(err, indexName) {
	            	 logger.info("ensureIndex:"+err+":"+indexName);
	             });
	             dbclient.ensureIndex(module.dbNames.flightSegmentName, {originPort:1,destPort:2}
	             , {background:true}, function(err, indexName) {
	            	 logger.info("ensureIndex:"+err+":"+indexName);
	             });
	             callback(null);
	             }
	        });
	}

	module.insertOne = function (collectionname, doc, callback /* (error, insertedDocument) */) {
		dbclient.collection(collectionname,function(error, collection){
			  if (error){
				  logger.error("insertOne hit error:"+error);
				  callback(error, null);
			  }
			  else{
				  collection.insert(doc, {safe: true}, callback);
			  }
			});
	};


	module.findOne = function(collectionname, key, callback /* (error, doc) */) {
		dbclient.collection(collectionname, function(error, collection){
			 if (error){
				  logger.error("findOne hit error:"+error);
				  callback(error, null);
			  }
			  else{
				collection.find({_id: key}).toArray(function(err, docs) {
					if (err) callback (err, null);
	                var doc = docs[0];
	                if (doc)
	                	callback(null, doc);
	                else
	                {
	                	logger.debug("Not found:"+key);
	                	callback(null, null)
	                }
				});
			  }
		});
	};

	module.update = function(collectionname, doc, callback /* (error, doc) */) {
		dbclient.collection(collectionname, function(error, collection){
			  if (error){
				  logger.error("update hit error:"+error);
				  callback(error, null);
			  }
			  else{
				collection.update({_id: doc._id}, doc, {safe: true}, function(err, numUpdates) {
					logger.debug(numUpdates);
					callback(err, doc);
				});
			  }
		});
	};

	module.remove = function(collectionname,condition, callback/* (error) */) {
		dbclient.collection(collectionname,function(error, collection){
			  if (error){
				  logger.error("remove hit error:"+error);
				  callback(error, null);
			  }
			  else{
				collection.remove({_id: condition._id}, {safe: true}, function(err, numDocs) {
					if (err) callback (err);
					else callback(null);
				});
			  }
		});
	};

	module.findBy = function(collectionname,condition, callback/* (error, docs) */) {
		dbclient.collection(collectionname,function(error, collection){
			  if (error){
				  logger.error("findBy hit error:"+error);
				  callback(error, null);
			  }
			  else{
				collection.find(condition).toArray(function(err, docs) {
					if (err) callback (err, null);
					else callback(null, docs);
				});
			  }
		});
	};
	
	module.count = function(collectionname, condition, callback/* (error, docs) */) {
		dbclient.collection(collectionname,function(error, collection){
			  if (error){
				  logger.error("count hit error:"+error);
				  callback(error, null);
			  }
			  else{
				collection.count(condition, function (err, count) {
					if (err) callback (err, null);
					else callback(null, count);
				});
			  }
		});
	};
	
	return module;

}

