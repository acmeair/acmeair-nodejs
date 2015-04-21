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

module.exports = function (authService,settings) {
    var module = {};
	var hystrix = require('../netflix/hystrix/index.js');
	var command = require('../netflix/hystrix/command.js');

	module.hystrixStream = function(request, response){
		hystrix.hystrixStream(request, response);
	}

	module.createSession = function(userid, callback /* (error, sessionId) */){
		command.getCommand("createSession", authService.createSession, function (error, cmd){
			if (error) callback (error, null);
			else{
				cmd.execute(userid, callback);
			}
		})
	}

	module.validateSession = function (sessionid, callback /* (error, userid) */){
		command.getCommand("validateSession", authService.validateSession, function (error, cmd){
			if (error) callback (error, null);
			else{
				cmd.execute(sessionid, callback);
			}
		})
	}
	
	module.invalidateSession  = function ( sessionid, callback /* (error) */){
		command.getCommand("invalidateSession", authService.invalidateSession, function (error, cmd){
			if (error) callback (error, null);
			else{
				cmd.execute(sessionid, callback);
			}
		})
	}
	
	return module;
}



