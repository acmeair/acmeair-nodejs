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
//		TODO: count(collname, condition as json of field and value, function(error, count))

module.exports = function (settings) {
    var module = {};

	var cassandraDB = require('cassandra-driver');
	var log4js = require('log4js');
	
	var logger = log4js.getLogger('dataaccess/cassandra');
	logger.setLevel(settings.loggerLevel);

	module.dbNames = {
		customerName: "n_customer",
		flightName:"n_flight",
		flightSegmentName:"n_flightSegment",
		bookingName:"n_booking",
		customerSessionName:"n_customerSession",
		airportCodeMappingName:"n_airportCodeMapping"
	}

	var upsertStmt ={
		"n_customer": "INSERT INTO n_customer (id,content) values (?, ?)",
		"n_customerSession": "INSERT INTO n_customerSession (id,content) values (?, ?)",
		"n_booking": "INSERT INTO n_booking (customerId,id,content) values (?, ?, ?)",
		"n_flight": "INSERT INTO n_flight (flightSegmentId,scheduledDepartureTime,id,content) values (?, ?, ?, ?)",
		"n_flightSegment": "INSERT INTO n_flightSegment (originPort,destPort,id,content) values (?, ?, ?,?)",
		"n_airportCodeMapping": "INSERT INTO n_airportCodeMapping (id,content) values (?, ?)"
	}
	
	var findByIdStmt = {
			"n_customer": "SELECT content from n_customer where id=?",
			"n_customerSession": "SELECT content from n_customerSession where id=?",
			"n_airportCodeMapping": "SELECT content from n_airportCodeMapping where id=?"
	}

	var dbConfig = calculateDBConfig();
	var dbclient = null;
	
	function calculateDBConfig(){
		var dbConfig ={};
		if (process.env.CASSANDRA_CP)
			dbConfig.contactPoints = JSON.parse(process.env.CASSANDRA_CP )
		else
			dbConfig.contactPoints = settings.cassandra_contactPoints;
		dbConfig.keyspace = process.env.CASSANDRA_KS || settings.cassandra_keyspace || "acmeair_keyspace";
		logger.info("Cassandra config:"+JSON.stringify(dbConfig));
		return dbConfig;
	}


	module.initializeDatabaseConnections = function(callback/*(error)*/) {
		var client = new cassandraDB.Client({ contactPoints: dbConfig.contactPoints, keyspace: dbConfig.keyspace});
		client.connect(function(err, result) {
			logger.info('Connected.');
			dbclient = client;
			callback(null);
		});
	}

	module.insertOne = function (collectionname, doc, callback /* (error, insertedDocument) */) {
		dbclient.execute(upsertStmt[collectionname], getUpsertParam(collectionname,doc), {prepare: true}, function(err) {
			  if (err) {callback(err, null);}
			  else {callback(null, doc);}
		});
	};

	function getUpsertParam(collectionname, doc){
		if (collectionname === 'n_booking' )
			return [doc.customerId, doc._id, JSON.stringify(doc)];
		if (collectionname === 'n_flight')
			return [doc.flightSegmentId, doc.scheduledDepartureTime, doc._id, JSON.stringify(doc)];
		if (collectionname ==='n_flightSegment')
			return [doc.originPort, doc.destPort, doc._id, JSON.stringify(doc)];
		return [doc._id, JSON.stringify(doc)];

	}
	module.findOne = function(collectionname, key, callback /* (error, doc) */) {
		var query = findByIdStmt[collectionname];
		if (! query) {
			callback ("FindById not supported on "+collectionname, null);
			return;
		}
		dbclient.execute(query, [key],{prepare: true}, function(err, result) {
			if(err) {callback(err, null)}
			else {callback (null, JSON.parse(result.rows[0].content))}
		});
	};

	module.update = function(collectionname, doc, callback /* (error, doc) */) {
		dbclient.execute(upsertStmt[collectionname], getUpsertParam(collectionname,doc), {prepare: true}, function(err) {
			  if (err) {callback(err, null);}
			  else {callback(null, doc);}
		});
	};

	module.remove = function(collectionname,condition, callback/* (error) */) {
		var info = getQueryInfo(collectionname, condition)
		var query = "DELETE from "+collectionname+" where "+ info.whereStmt;
		logger.debug("query:"+query +", param:"+ JSON.stringify(info.param))
		dbclient.execute(query, info.param, {prepare: true},function(err, result) {
			if(err) {callback(err)}
			else {callback (null)}
		});
	};

	function getQueryInfo(collectionname, condition){
		var param = [];
		var whereStmt =""
		var first = true;
		for (var key in condition) {
			if (!first) whereStmt +=" and ";
			if (key === '_id')
				whereStmt += "id=?";
			else
				whereStmt += key +"=?";
			first = false;
			param.push(condition[key]);
		}
		return {"whereStmt":whereStmt, "param":param};
	}

	module.findBy = function(collectionname,condition, callback/* (error, docs) */) {
		var info = getQueryInfo(collectionname, condition)
		var query = "SELECT content from "+collectionname+" where "+ info.whereStmt;
		logger.debug("query:"+query +", param:"+ JSON.stringify(info.param))
		dbclient.execute(query, info.param,{prepare: true}, function(err, result) {
			if(err) {callback(err, null)}
			else {
				var docs = [];
				for (var i = 0; i < result.rows.length; i++) {
					logger.debug("result["+i +"]="+ JSON.stringify(result.rows[i]));
					docs.push(JSON.parse(result.rows[i].content));
				}		
				callback (null, docs)
			}
		});
	};
	
	//TODO Implement count method for cassandra -- currently a stub returning -1
	module.count = function(collectionname, condition, callback/* (error, docs) */) {
		callback(null, -1);
	};
	
	return module;

}

