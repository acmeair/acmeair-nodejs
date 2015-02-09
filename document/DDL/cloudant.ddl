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

Create API Key and passcode

Create Database and grant read/write to the above API

    n_airportcodemapping
	n_booking
	n_customer
	n_customersession
	n_flight
	n_flightsegment


Create Search Index: 

	booking: /_design/view, n_bookings

	function(doc){
	    index("default", doc._id);
    	    if(doc.customerId){
           	index("customerId", doc.customerId, {"store": "yes"});
    	    }
	}


	n_flight: /_design/view, n_flights

	function(doc){
	    index("default", doc._id);
    	    if(doc.flightSegmentId){
           	index("flightSegmentId", doc.flightSegmentId, {"store": "yes"});
    	    }
    	    if(doc.scheduledDepartureTime){
           	index("scheduledDepartureTime", doc.scheduledDepartureTime, {"store": "yes"});
    	    }
	}

	n_flightsegment: /_design/view, n_flightsegments

	function(doc){
	    index("default", doc._id);
    	    if(doc.originPort){
           	index("originPort", doc.originPort, {"store": "yes"});
    	    }
    	    if(doc.destPort){
           	index("destPort", doc.destPort, {"store": "yes"});
    	    }
	}



	// The following is not needed as the query never hapens. Match mongo behavior
	n_customersession: /_design/view, n_customersessions

	function(doc){
	    index("default", doc._id);
    	    if(doc.customerid){
           	index("customerid", doc.customerid, {"store": "yes"});
    	    }
	}

