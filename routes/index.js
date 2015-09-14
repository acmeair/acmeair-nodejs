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

module.exports = function (dbtype, authService, settings) {
    var module = {};
	var uuid = require('node-uuid');
	var log4js = require('log4js');
	var flightCache = require('ttl-lru-cache')({maxLength:settings.flightDataCacheMaxSize});
	var flightSegmentCache = require('ttl-lru-cache')({maxLength:settings.flightDataCacheMaxSize});
	var flightDataCacheTTL = settings.flightDataCacheTTL == -1 ? null : settings.flightDataCacheTTL; 
	
	var logger = log4js.getLogger('routes');
	logger.setLevel(settings.loggerLevel);

	var daModuleName = "../dataaccess/"+dbtype+"/index.js";
	logger.info("Use dataaccess:"+daModuleName);
	var dataaccess = new require(daModuleName)(settings);
	
	module.dbNames = dataaccess.dbNames
	
	module.initializeDatabaseConnections = function(callback/*(error)*/) {
		dataaccess.initializeDatabaseConnections(callback)
	}

	module.insertOne = function (collectionname, doc, callback /* (error, insertedDocument) */) {
		dataaccess.insertOne(collectionname, doc, callback)
	};

	module.checkForValidSessionCookie = function(req, res, next) {
		logger.debug('checkForValidCookie');
		var sessionid = req.cookies.sessionid;
		if (sessionid) {
			sessiondid = sessionid.trim();
		}
		if (!sessionid || sessionid == '') {
			logger.debug('checkForValidCookie - no sessionid cookie so returning 403');
			res.sendStatus(403);
			return;
		}
	
		validateSession(sessionid, function(err, customerid) {
			if (err) {
				logger.debug('checkForValidCookie - system error validating session so returning 500');
				res.sendStatus(500);
				return;
			}
			
			if (customerid) {
				logger.debug('checkForValidCookie - good session so allowing next route handler to be called');
				req.acmeair_login_user = customerid;
				next();
				return;
			}
			else {
				logger.debug('checkForValidCookie - bad session so returning 403');
				res.sendStatus(403);
				return;
			}
		});
	}

	module.login = function(req, res) {
		logger.debug('logging in user');
		var login = req.body.login;
		var password = req.body.password;
	
		res.cookie('sessionid', '');
		
		// replace eventually with call to business logic to validate customer
		validateCustomer(login, password, function(err, customerValid) {
			if (err) {
				res.send(500,err); // TODO: do I really need this or is there a cleaner way??
				return;
			}
			
			if (!customerValid) {
				res.sendStatus(403);
			}
			else {
				createSession(login, function(error, sessionid) {
					if (error) {
						logger.info(error);
						res.send(500, error);
						return;
					}
					res.cookie('sessionid', sessionid);
					res.send('logged in');
				});
			}
		});
	};

	module.logout = function(req, res) {
		logger.debug('logging out user');
		
		var sessionid = req.cookies.sessionid;
		var login = req.body.login;
		invalidateSession(sessionid, function(err) {
			res.cookie('sessionid', '');
			res.send('logged out');
		});
	};

	module.queryflights = function(req, res) {
		logger.debug('querying flights');
		
		var fromAirport = req.body.fromAirport;
		var toAirport = req.body.toAirport;
		var fromDateWeb = new Date(req.body.fromDate);
		var fromDate = new Date(fromDateWeb.getFullYear(), fromDateWeb.getMonth(), fromDateWeb.getDate()); // convert date to local timezone
		var oneWay = (req.body.oneWay == 'true');
		var returnDateWeb = new Date(req.body.returnDate);
		var returnDate;
		if (!oneWay) {
			returnDate = new Date(returnDateWeb.getFullYear(), returnDateWeb.getMonth(), returnDateWeb.getDate()); // convert date to local timezone
		}
		
		getFlightByAirportsAndDepartureDate(fromAirport, toAirport, fromDate, function (error, flightSegmentOutbound, flightsOutbound) {
			logger.debug('flightsOutbound = ' + flightsOutbound);
			if (flightsOutbound) {
				for (ii = 0; ii < flightsOutbound.length; ii++) {
					flightsOutbound[ii].flightSegment = flightSegmentOutbound;
				}
			}
			else {
				flightsOutbound = [];
			}
			if (!oneWay) {
				getFlightByAirportsAndDepartureDate(toAirport, fromAirport, returnDate, function (error, flightSegmentReturn, flightsReturn) {
					logger.debug('flightsReturn = ' + JSON.stringify(flightsReturn));
					if (flightsReturn) {
						for (ii = 0; ii < flightsReturn.length; ii++) {
							flightsReturn[ii].flightSegment = flightSegmentReturn;
						}
					}
					else {
						flightsReturn = [];
					}
					var options = {"tripFlights":
						[
						 {"numPages":1,"flightsOptions": flightsOutbound,"currentPage":0,"hasMoreOptions":false,"pageSize":10},
						 {"numPages":1,"flightsOptions": flightsReturn,"currentPage":0,"hasMoreOptions":false,"pageSize":10}
						], "tripLegs":2};
					res.send(options);
				});
			}
			else {
				var options = {"tripFlights":
					[
					 {"numPages":1,"flightsOptions": flightsOutbound,"currentPage":0,"hasMoreOptions":false,"pageSize":10}
					], "tripLegs":1};
				res.send(options);
			}
		});
	};

	module.bookflights = function(req, res) {
		logger.debug('booking flights');
		
		var userid = req.body.userid;
		var toFlight = req.body.toFlightId;
		var retFlight = req.body.retFlightId;
		var oneWay = (req.body.oneWayFlight == 'true');
		
		logger.debug("toFlight:"+toFlight+",retFlight:"+retFlight);
		
		bookFlight(toFlight, userid, function (error, toBookingId) {
			if (!oneWay) {
				bookFlight(retFlight, userid, function (error, retBookingId) {
					var bookingInfo = {"oneWay":false,"returnBookingId":retBookingId,"departBookingId":toBookingId};
					res.header('Cache-Control', 'no-cache');
					res.send(bookingInfo);
				});
			}
			else {
				var bookingInfo = {"oneWay":true,"departBookingId":toBookingId};
				res.header('Cache-Control', 'no-cache');
				res.send(bookingInfo);
			}
		});
	};

	module.cancelBooking = function(req, res) {
		logger.debug('canceling booking');
		
		var number = req.body.number;
		var userid = req.body.userid;
		
		cancelBooking(number, userid, function (error) {
			if (error) {
				res.send({'status':'error'});
			}
			else {
				res.send({'status':'success'});
			}
		});
	};

	module.bookingsByUser = function(req, res) {
		logger.debug('listing booked flights by user ' + req.params.user);
	
		getBookingsByUser(req.params.user, function(err, bookings) {
			if (err) {
				res.sendStatus(500);
			}
			res.send(bookings);
		});
	};

	module.getCustomerById = function(req, res) {
		logger.debug('getting customer by user ' + req.params.user);
	
		getCustomer(req.params.user, function(err, customer) {
			if (err) {
				res.sendStatus(500);
			}
			res.send(customer);
		});
	};

	module.putCustomerById = function(req, res) {
		logger.debug('putting customer by user ' + req.params.user);
		
		updateCustomer(req.params.user, req.body, function(err, customer) {
			if (err) {
				res.sendStatus(500);
			}
			res.send(customer);
		});
	};

	module.toGMTString  = function(req, res) {
		logger.info('******* running eyecatcher function');
		var now = new Date().toGMTString();
		res.send(now);
	};
	
	module.getRuntimeInfo = function(req,res) {
		var runtimeInfo = [];
		runtimeInfo.push({"name":"Runtime","description":"NodeJS"});
		var versions = process.versions;
		for (var key in versions) {
			runtimeInfo.push({"name":key,"description":versions[key]});
		}
		res.contentType('application/json');
		res.send(JSON.stringify(runtimeInfo));
	};
	
	module.getDataServiceInfo = function(req,res) {
		var dataServices = [{"name":"cassandra","description":"Apache Cassandra NoSQL DB"},
		                    {"name":"cloudant","description":"IBM Distributed DBaaS"},
		                    {"name":"mongo","description":"MongoDB NoSQL DB"}];
		res.send(JSON.stringify(dataServices));
	};
	
	module.getActiveDataServiceInfo = function (req,res) {
		res.send(dbtype);
	};
	
	module.countBookings = function(req,res) {
		countItems(module.dbNames.bookingName, function (error,count){
			if (error){
				res.send("-1");
			} else {
				res.send(count.toString());
			}
		});
	};
	
	module.countCustomer = function(req,res) {
		countItems(module.dbNames.customerName, function (error,count){
			if (error){
				res.send("-1");
			} else {
				res.send(count.toString());
			}
		});
	};
	
	module.countCustomerSessions = function(req,res) {
		countItems(module.dbNames.customerSessionName, function (error,count){
			if (error){
				res.send("-1");
			} else {
				res.send(count.toString());
			}
		});
	};
	
	module.countFlights = function(req,res) {
		countItems(module.dbNames.flightName, function (error,count){
			if (error){
				res.send("-1");
			} else {
				res.send(count.toString());
			}
		});
	};
	
	module.countFlightSegments = function(req,res) {
		countItems(module.dbNames.flightSegmentName, function (error,count){
			if (error){
				res.send("-1");
			} else {
				res.send(count.toString());
			}
		});
	};
	
	module.countAirports = function(req,res) {
		countItems(module.dbNames.airportCodeMappingName, function (error,count){
			if (error){
				res.send("-1");
			} else {
				res.send(count.toString());
			}
		});
	};
	
	function countItems(dbName, callback /*(error, count)*/) {
		console.log("Calling count on " + dbName);
		dataaccess.count(dbName, {}, function(error, count) {
			console.log("Output for "+dbName+" is "+count);
			if (error) callback(error, null);
			else {
				callback(null,count);
			}
		});
	};

	function validateCustomer(username, password, callback /* (error, boolean validCustomer) */) {
		dataaccess.findOne(module.dbNames.customerName, username, function(error, customer){
				if (error) callback (error, null);
				else{
	                if (customer)
	                {
	                	callback(null, customer.password == password);
	                }
	                else
	                	callback(null, false)
				}
		});
	};

	function createSession(customerId, callback /* (error, sessionId) */) {
		if (authService){
			authService.createSession(customerId,callback);
			return;
		}
		var now = new Date();
		var later = new Date(now.getTime() + 1000*60*60*24);
			
		var document = { "_id" : uuid.v4(), "customerid" : customerId, "lastAccessedTime" : now, "timeoutTime" : later };

		dataaccess.insertOne(module.dbNames.customerSessionName, document, function (error, doc){
			if (error) callback (error, null)
			else callback(error, document._id);
		});
	}

	function validateSession(sessionId, callback /* (error, userid) */) {
		if (authService){
		     authService.validateSession(sessionId,callback);
		     return;
		}
		var now = new Date();
			
	    dataaccess.findOne(module.dbNames.customerSessionName, sessionId, function(err, session) {
			if (err) callback (err, null);
			else{
				if (now > session.timeoutTime) {
					daraaccess.remove(module.dbNames.customerSessionName,{'_id':sessionId}, function(error) {
						if (error) callback (error, null);
						else callback(null, null);
					});
				}
				else
					callback(null, session.customerid);
			}
		});
	}

	function getCustomer(username, callback /* (error, Customer) */) {
	    dataaccess.findOne(module.dbNames.customerName, username, callback);
	}

	function updateCustomer(login, customer, callback /* (error, Customer) */) {
	    dataaccess.update(module.dbNames.customerName, customer,callback)
	}

	function getBookingsByUser(username, callback /* (error, Bookings) */) {
		dataaccess.findBy(module.dbNames.bookingName, {'customerId':username},callback)
	}

	function invalidateSession(sessionid, callback /* error */) {
		if (authService){
			authService.invalidateSession(sessionid,callback);
		    return;
		}
		  
	    dataaccess.remove(module.dbNames.customerSessionName,{'_id':sessionid},callback) 
	}


	function getFlightByAirportsAndDepartureDate(fromAirport, toAirport, flightDate, callback /* error, flightSegment, flights[] */) {
		logger.debug("getFlightByAirportsAndDepartureDate " + fromAirport + " " + toAirport + " " + flightDate);
		
		getFlightSegmentByOriginPortAndDestPort(fromAirport, toAirport, function(error, flightsegment) {
			if (error) {
				logger.error("Hit error:"+error);
				throw error;
			}
			
			logger.debug("flightsegment = " + JSON.stringify(flightsegment));
			if (!flightsegment) {
				callback(null, null, null);
				return;
			}
			
			var date = new Date(flightDate.getFullYear(), flightDate.getMonth(), flightDate.getDate(),0,0,0,0);
	
			var cacheKey = flightsegment._id + "-" + date.getTime();
			if (settings.useFlightDataRelatedCaching) {
				var flights = flightCache.get(cacheKey);
				if (flights) {
					logger.debug("cache hit - flight search, key = " + cacheKey);
					callback(null, flightsegment, (flights == "NULL" ? null : flights));
					return;
				}
				logger.debug("cache miss - flight search, key = " + cacheKey + " flightCache size = " + flightCache.size());
			}
			var searchCriteria = {flightSegmentId: flightsegment._id, scheduledDepartureTime: date};
			dataaccess.findBy(module.dbNames.flightName, searchCriteria, function(err, docs) {
				if (err) {
					logger.error("hit error:"+err);
					callback (err, null, null);
				}else
				{
					("after cache miss - key = " + cacheKey + ", docs = " + JSON.stringify(docs));
	
					var docsEmpty = !docs || docs.length == 0;
				
					if (settings.useFlightDataRelatedCaching) {
						var cacheValue = (docsEmpty ? "NULL" : docs);
						("about to populate the cache with flights key = " + cacheKey + " with value of " + JSON.stringify(cacheValue));
						flightCache.set(cacheKey, cacheValue, flightDataCacheTTL);
						("after cache populate with key = " + cacheKey + ", flightCacheSize = " + flightCache.size())
					}
					callback(null, flightsegment, docs);
				}
			});
		});
	}

	function getFlightSegmentByOriginPortAndDestPort(fromAirport, toAirport, callback /* error, flightsegment */) {
		var segment;
		
		if (settings.useFlightDataRelatedCaching) {
			segment = flightSegmentCache.get(fromAirport+toAirport);
			if (segment) {
				("cache hit - flightsegment search, key = " + fromAirport+toAirport);
				callback(null, (segment == "NULL" ? null : segment));
				return;
			}
			("cache miss - flightsegment search, key = " + fromAirport+toAirport + ", flightSegmentCache size = " + flightSegmentCache.size());
		}
		dataaccess.findBy(module.dbNames.flightSegmentName,{originPort: fromAirport, destPort: toAirport},function(err, docs) {
			if (err) callback (err, null);
			else {
				segment = docs[0];
				if (segment == undefined) {
					segment = null;
				}
				if (settings.useFlightDataRelatedCaching) {
					("about to populate the cache with flightsegment key = " + fromAirport+toAirport + " with value of " + JSON.stringify(segment));
					flightSegmentCache.set(fromAirport+toAirport, (segment == null ? "NULL" : segment), flightDataCacheTTL);
					("after cache populate with key = " + fromAirport+toAirport + ", flightSegmentCacheSize = " + flightSegmentCache.size())
				}
				callback(null, segment);
			}
		});
	}


	function bookFlight(flightId, userid, callback /* (error, bookingId) */) {
			
		var now = new Date();
		var docId = uuid.v4();
	
		var document = { "_id" : docId, "customerId" : userid, "flightId" : flightId, "dateOfBooking" : now };
		
		dataaccess.insertOne(module.dbNames.bookingName,document,function(err){
			callback(err, docId);
		});
	}

	function cancelBooking(bookingid, userid, callback /*(error)*/) {
		dataaccess.remove(module.dbNames.bookingName,{'_id':bookingid, 'customerId':userid}, callback)
	}

	return module;
}

