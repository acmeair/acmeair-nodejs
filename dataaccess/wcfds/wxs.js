var url = require('url')
  , http = require('http')
  , stream = require('stream')
  , rest = require('./rest');

/**
 * Initialize an object from the credentials object in the
 * VCAP_SERVICES environment variable:
 * 
 * "credentials": {
            "catalogEndPoint": "75.126.155.134:2809",
            "restResource": "http://75.126.155.134/resources/datacaches/U8DDeSaMQXiWIJSN8GL1MQPO",
            "restResourceSecure": "https://75.126.155.134/resources/datacaches/U8DDeSaMQXiWIJSN8GL1MQPO",
            "gridName": "U8DDeSaMQXiWIJSN8GL1MQPO",
            "username": "i163HXBTRayN4I5WStTRQwIS",
            "password": "QsqYokdQSZODwPe9aOXmngWM"
         }
 *
 */
function WXS(properties) {
  this.wxs = properties;
  if (this.wxs.restResource.indexOf('http://') != 0)
    this.wxs.restResource = 'http://' + this.wxs.restResource;
  this.auth = 'Basic '
      + new Buffer(this.wxs.username + ':' + this.wxs.password)
          .toString('base64');
  var p = url.parse(this.wxs.restResource);
  this.baseUrl = 'http://' + p.hostname;
  this.pathname = p.pathname;

  console.log("pathname=", this.pathname); // debug only
  console.log("baseUrl=", this.baseUrl); // debug only
  console.log("wxsclient url=" + this.wxs.restResource); // debug only
  console.log("wxsclient username=" + this.wxs.username); // debug only
}

WXS.prototype = {

  /**
   * Cache a key/vale pair in a map.
   * 
   * @param map           the map name
   * @param key           the name of the key
   * @param value         the value, which may represent an xml, json, or anything else, depending on contenttype
   *                      the value should be a string, an object, or a stream.Readable. If it is an object the
   *                      the JSON.stringify() will be applied before sending out.
   * @param contentType   the type of the value application/xml, application/json, application/octet-stream
   * @param callback(err) the function handling the result of the post. in case of failure
   *                      result is an Error object that may contain the fields
   *                      status: <response status code>, message: <data sent with the
   *                      response>, responseHeaders: <the headers in the response>.
   *                      in case of success nothing is passed to the callback.
   */
  put : function(map, key, value, contentType, size, callback) {
    console.log('>> WXS.put');

    switch (contentType.toLocaleLowerCase()) {
      case 'application/json':
      case 'application/xml':
      case 'application/octet-stream':
        break;
      default:
        console.log("Warning, invalid content-type %s. Defaulting to application/octet-stream.", contentType);
        contentType = 'application/octet-stream';
    }

    // If map not set, then use the dafault map, which has the name of the grid
    if ( !map || map.trim().length==0 )
      map = this.wxs.gridName;

    var resource = this.pathname + '/' + encodeURIComponent(map) + '/' + encodeURIComponent(key);
    var headers = {
      'Content-Type' : contentType,
      'Authorization' : this.auth
    };
    var options = {
      rejectUnauthorized : false,
      agent : false
    };

    if ( typeof value === "object" && !(value instanceof stream.Readable) ) {
      value = JSON.stringify(value);
    }

    if ( value instanceof stream.Readable ) {
      if ( size && typeof size === "number" ) {
        headers['Content-Length'] = size;
      } else {
        headers['Transfer-Encoding'] = 'chunked';
      }
    }

    if ( typeof size === "function" ) {
      callback = size;
    }

    rest.post(this.baseUrl, resource, headers, options, value, function(res) {
        console.log('<< WXS.put Value cached. Response from the ECaaS server: ', res);
        callback && res instanceof Error ? callback(res): callback();
      });
  },


  /**
   * Get the value of a key in a map.
   * 
   * @param map           the map name
   * @param key           the name of the key
   * @param callback(val) the function handling the result of the get. in case of failure
   *                      result is an Error object that may contain the fields
   *                      status: <response status code>, message: <data sent with the
   *                      response>, responseHeaders: <the headers in the response>.
   *                      in case of success val is an object with:
   *                      status: <response status code>, responseText: <value of key in map>,
   *                      responseHeaders: <the headers in the response>. You can read
   *                      the type of the value from the content-type header of the response.
   */
  get : function(map, key, callback) {
    console.log('>> WXS.get');

    // If map not set, then use the dafault map, which has the name of the grid
    if ( !map || map.trim().length==0 )
      map = this.wxs.gridName;

    var resource = this.pathname + '/' + encodeURIComponent(map) + '/' + encodeURIComponent(key);
    var headers = {
      'Accept' : '*/*',
      'Authorization' : this.auth
    };
    var options = {
      rejectUnauthorized : false,
      agent : false
    };

    rest.get(this.baseUrl, resource, headers, options, function(res) {
        console.log('<< WXS.get Value got. Response from the ECaaS server: ', res);
        callback && callback(res);
      });
  },

  /**
   * Remove a key from a map.
   * 
   * @param map           the map name
   * @param key           the name of the key
   * @param callback(res) the function handling the result of the get. in case of failure
   *                      result is an Error object that may contain the fields
   *                      status: <response status code>, message: <data sent with the
   *                      response>, responseHeaders: <the headers in the response>.
   *                      Nothing is passed to callback in case of success.
   */
  remove : function(map, key, callback) {
    console.log('>> WXS.remove');

    // If map not set, then use the dafault map, which has the name of the grid
    if ( !map || map.trim().length==0 )
      map = this.wxs.gridName;

    var resource = this.pathname + '/' + encodeURIComponent(map) + '/' + encodeURIComponent(key);
    var headers = {
      'Accept' : '*/*',
      'Authorization' : this.auth
    };
    var options = {
      rejectUnauthorized : false,
      agent : false
    };

    rest.del(this.baseUrl, resource, headers, options, function(res) {
        console.log('<< WXS.remove Value removed. Response from the ECaaS server: ', res);
        callback && res instanceof Error ? callback(res): callback();
      });
  },

  /**
   * Remove an entire map from the cache.
   * 
   * @param map           the map name
   * @param callback(res) the function handling the result of the get. in case of failure
   *                      result is an Error object that may contain the fields
   *                      status: <response status code>, message: <data sent with the
   *                      response>, responseHeaders: <the headers in the response>.
   *                      Nothing is passed to callback in case of success.
   */
  clearMap : function(map, callback) {
    console.log('>> WXS.clearMap');

    // If map not set, then use the dafault map, which has the name of the grid
    if ( !map || map.trim().length==0 )
      map = this.wxs.gridName;

    var resource = this.pathname + '/' + encodeURIComponent(map);
    var headers = {
      'Accept' : '*/*',
      'Authorization' : this.auth
    };
    var options = {
      rejectUnauthorized : false,
      agent : false
    };

    rest.del(this.baseUrl, resource, headers, options, function(res) {
        console.log('<< WXS.clearMap Map cleared (all keys removed). Response from the ECaaS server: ', res);
        callback && res instanceof Error ? callback(res): callback();
      });
  }
};

module.exports = WXS;
