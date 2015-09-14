var util = require('util')
  , url = require('url')
  , http = require('http')
  , stream = require('stream');

/**
 * Perform a http request and notify completion through the callbacks: -
 * onOkCb(result) is called in case of success; - onErrCb(error) is called in
 * case of error.
 * 
 * @param method
 *          a valid HTTP method
 * @param url_
 *          the endpoint URL of the request
 * @param resource
 *          the resource of the HTTP endpoint
 * @param headers
 *          the HTTP headers of the request
 * @param options
 *          additional options to pass to the http.request() (see node.js docs)
 *          It can be null, which means no additional options
 * @param body
 *          the body of the request to send. It can be null if there is nothing
 *          to send. If present, it can be a string or it can be a Readable
 *          Stream, in which case it is read and sent to the server till the end
 *          of the input stream.
 * @param resStream
 *          the response of the request is communicated by default in the
 *          result.responseText of the onOkCb(result). If you set the resStream
 *          parameter to a valid stream.Writeable object, then the response of the
 *          request is written there. You might want to do that for downloading
 *          blobs of binary data.
 * @param onOkCb(result)
 *          the function called if the request succeeded. result is an object
 *          with: status: <response status code>, responseText: <body of the
 *          response>, responseHeaders: <the headers in the response>.
 * @param onErrCb(err)
 *          the function called in case of failure. err is an Error object with:
 *          status: <response status code>, message: <data sent with the
 *          response>, responseHeaders: <the headers in the response>.
 */
var doRequest = function(method, url_, resource, headers, options, body,
    resStream, onOkCb, onErrCb) {

  console.log('>> doRequest('+method+', '+url_+', '+resource+', '+headers+', '+options+', '+body+', '+resStream); // debug only

  var parsedUrl = url.parse(url_ + resource);

  if (!options) {
    options = {};
  }
  if (!headers) {
    headers = {};
  }

  options.hostname = parsedUrl.hostname;
  options.port = parsedUrl.port;
  options.path = parsedUrl.path;
  options.headers = headers;
  options.method = method;

  var handleResponse = function(res) {
    var r_s = null;
    if (resStream) {
      res.on('data', function(chunk) {
        resStream.write(chunk);
      });
    } else {
      r_s = '';
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        r_s += chunk;
      });
    }

    res.on('end', function() {
      var err = null;
      var result = null;
      if (res.statusCode < 208) {
        result = {
          status : res.statusCode,
          responseText : r_s,
          responseHeaders : res.headers
        };
//        console.info("doRequest success. result is: " + JSON.stringify(result)); // debug only
      } else {
        err = new Error((typeof r_s==="string") ? r_s : 'Message wrote to resStream');
        err.status = res.statusCode;
        err.responseHeaders = res.headers;
        console.error("Got an error status code: " + util.inspect(err)); // debug only
      }

      if (err) {
        onErrCb && onErrCb(err);
      } else {
        onOkCb && onOkCb(result);
      }
    });
  };

  var writeBodyAndFinalize = function(req) {
    if (body) {
      if (typeof body === "string") {
        req.end(body);
      } else { // it is supposed to be a Readable Stream
        body.pipe(req, {
          end : true
        });
      }
    } else {
      req.end();
    }
  };

  // Create the http request, finally
  var req = http.request(options, handleResponse);

  // Set some event handlers
  req.on('error', function(e) {
    console.trace("Error submitting request");
    req.end();
    onErrCb && onErrCb(e);
  });

  req.on('continue', function() {
    console.info('Expect: 100-continue was set and received acknowledge from the server to send data. Write the body then'); // debug only
    writeBodyAndFinalize(req);
  });

  if (headers['Expect'] === undefined || headers['Expect'] !== '100-continue') {
    writeBodyAndFinalize(req);
  }

//  console.info('Submitting request: ', options);  // debug only
};

var doPutOrPostJson = function(method, url_, resource, headers, options, bodyJson, callback) {
  if ( typeof bodyJson === "object" && !(bodyJson instanceof stream.Readable) ) {
    bodyJson = JSON.stringify(bodyJson);
  }
  if ( !headers ) {
    headers = {};
  }
  headers['Content-type'] = 'application/json';
  doRequest(method, url_, resource, headers, options, bodyJson, null, function(ok) {callback(ok);}, function(err) {callback(err);});
};

var doPutOrPost = function(method, url_, resource, headers, options, body, callback) {
  doRequest(method, url_, resource, headers, options, body, null, function(ok) {callback(ok);}, function(err) {callback(err);});
};

/**
 * Do a POST of a JSON payload.
 * 
 * @param url_
 *          the endpoint URL of the request
 * @param resource
 *          the resource of the HTTP endpoint
 * @param headers
 *          the HTTP headers of the request
 *          note that the content-type is automatically set to 
 *          application/json, so you don't need to set it
 * @param options
 *          additional options to pass to the http.request() (see node.js docs)
 *          It can be null, which means no additional options
 * @param body
 *          can be a valid JSON string, a valid JSON stream.Readable object, or
 *          a JS object, which will be encoded as JSON
 * @param callback(result)
 *          the function handling the result of the post. in case of failure
 *          result is an Error object that may contain the fields
 *          status: <response status code>, message: <data sent with the
 *          response>, responseHeaders: <the headers in the response>.
 *          in case of success result is an object with:
 *          status: <response status code>, responseText: <body of the
 *          response>, responseHeaders: <the headers in the response>.
 */
var doPostJson = function(url_, resource, headers, options, bodyJson, callback) {
  doPutOrPostJson('POST', url_, resource, headers, options, bodyJson, callback);
};

/**
 * Do a POST arbitrary data.
 * 
 * @param url_
 *          the endpoint URL of the request
 * @param resource
 *          the resource of the HTTP endpoint
 * @param headers
 *          the HTTP headers of the request
 * @param options
 *          additional options to pass to the http.request() (see node.js docs)
 *          It can be null, which means no additional options
 * @param body
 *          can be a string or a valid stream.Readable object
 * @param callback(result)
 *          the function handling the result of the post. in case of failure
 *          result is an Error object that may contain the fields
 *          status: <response status code>, message: <data sent with the
 *          response>, responseHeaders: <the headers in the response>.
 *          in case of success result is an object with:
 *          status: <response status code>, responseText: <body of the
 *          response>, responseHeaders: <the headers in the response>.
 */
var doPost = function(url_, resource, headers, options, body, callback) {
  doPutOrPost('POST', url_, resource, headers, options, body, callback);
};

/**
 * Do a PUT of a JSON payload.
 * 
 * @param url_
 *          the endpoint URL of the request
 * @param resource
 *          the resource of the HTTP endpoint
 * @param headers
 *          the HTTP headers of the request
 *          note that the content-type is automatically set to 
 *          application/json, so you don't need to set it
 * @param options
 *          additional options to pass to the http.request() (see node.js docs)
 *          It can be null, which means no additional options
 * @param body
 *          can be a valid JSON string, a valid JSON stream.Readable object, or
 *          a JS object, which will be encoded as JSON
 * @param callback(result)
 *          the function handling the result of the post. in case of failure
 *          result is an Error object that may contain the fields
 *          status: <response status code>, message: <data sent with the
 *          response>, responseHeaders: <the headers in the response>.
 *          in case of success result is an object with:
 *          status: <response status code>, responseText: <body of the
 *          response>, responseHeaders: <the headers in the response>.
 */
var doPutJson = function(url_, resource, headers, options, bodyJson, callback) {
  doPutOrPostJson('PUT', url_, resource, headers, options, bodyJson, callback);
};

/**
 * Do a PUT arbitrary data.
 * 
 * @param url_
 *          the endpoint URL of the request
 * @param resource
 *          the resource of the HTTP endpoint
 * @param headers
 *          the HTTP headers of the request
 * @param options
 *          additional options to pass to the http.request() (see node.js docs)
 *          It can be null, which means no additional options
 * @param body
 *          can be a string or a valid stream.Readable object
 * @param callback(result)
 *          the function handling the result of the post. in case of failure
 *          result is an Error object that may contain the fields
 *          status: <response status code>, message: <data sent with the
 *          response>, responseHeaders: <the headers in the response>.
 *          in case of success result is an object with:
 *          status: <response status code>, responseText: <body of the
 *          response>, responseHeaders: <the headers in the response>.
 */
var doPut = function(url_, resource, headers, options, body, callback) {
  doPutOrPost('PUT', url_, resource, headers, options, body, callback);
};

/**
 * Do a GET of arbitrary data.
 * 
 * @param url_
 *          the endpoint URL of the request
 * @param resource
 *          the resource of the HTTP endpoint
 * @param headers
 *          the HTTP headers of the request
 * @param options
 *          additional options to pass to the http.request() (see node.js docs)
 *          It can be null, which means no additional options
 * @param callback(result)
 *          the function handling the result of the post. in case of failure
 *          result is an Error object that may contain the fields
 *          status: <response status code>, message: <data sent with the
 *          response>, responseHeaders: <the headers in the response>.
 *          in case of success result is an object with:
 *          status: <response status code>, responseText: <body of the
 *          response>, responseHeaders: <the headers in the response>.
 */
var doGet = function(url_, resource, headers, options, callback) {
  doRequest('GET', url_, resource, headers, options, null, null, function(ok) {callback(ok);}, function(err) {callback(err);});
};

/**
 * Do a GET of JSON data.
 * 
 * @param url_
 *          the endpoint URL of the request
 * @param resource
 *          the resource of the HTTP endpoint
 * @param headers
 *          the HTTP headers of the request
 *          note that the Accept header is automatically set
 *          to application/json, so you don't need to do that
 * @param options
 *          additional options to pass to the http.request() (see node.js docs)
 *          It can be null, which means no additional options
 * @param callback(result)
 *          the function handling the result of the post. in case of failure
 *          result is an Error object that may contain the fields
 *          status: <response status code>, message: <data sent with the
 *          response>, responseHeaders: <the headers in the response>.
 *          in case of success result is an object with:
 *          status: <response status code>, responseText: <body of the
 *          response>, responseHeaders: <the headers in the response>.
 */
var doGetJson = function(url_, resource, headers, options, callback) {
  if ( !headers ) {
    headers = {};
  }
  headers['Accept'] = 'application/json';
  doGet(url_, resource, headers, options, callback);
};

/**
 * Do a GET of BLOB of data and write them to a stream.
 * 
 * @param url_
 *          the endpoint URL of the request
 * @param resource
 *          the resource of the HTTP endpoint
 * @param headers
 *          the HTTP headers of the request
 *          note that the Accept header is automatically set
 *          to application/json, so you don't need to do that
 * @param options
 *          additional options to pass to the http.request() (see node.js docs)
 *          It can be null, which means no additional options
 * @param wStream
 *          a stream.Writeable where the response body is written.
 * @param callback(result)
 *          the function handling the result of the post. in case of failure
 *          result is an Error object that may contain the fields
 *          status: <response status code>, message: <data sent with the
 *          response>, responseHeaders: <the headers in the response>.
 *          in case of success result is an object with:
 *          status: <response status code>, responseHeaders: <the headers in the response>.
 */
var doGetBlob = function(url_, resource, headers, options, wStream, callback) {
  doRequest('GET', url_, resource, headers, options, null, wStream, function(ok) {callback(ok);}, function(err) {callback(err);});
};

/**
 * Do a DELETE.
 * 
 * @param url_
 *          the endpoint URL of the request
 * @param resource
 *          the resource of the HTTP endpoint
 * @param headers
 *          the HTTP headers of the request
 * @param options
 *          additional options to pass to the http.request() (see node.js docs)
 *          It can be null, which means no additional options
 * @param callback(result)
 *          the function handling the result of the post. in case of failure
 *          result is an Error object that may contain the fields
 *          status: <response status code>, message: <data sent with the
 *          response>, responseHeaders: <the headers in the response>.
 *          in case of success result is an object with:
 *          status: <response status code>, responseText: <body of the
 *          response>, responseHeaders: <the headers in the response>.
 */
var doDelete = function(url_, resource, headers, options, callback) {
  doRequest('DELETE', url_, resource, headers, options, null, null, function(ok) {callback(ok);}, function(err) {callback(err);});
};

module.exports = {
  doRequest : doRequest,
  get : doGet,
  getJson : doGetJson,
  getBlob : doGetBlob,
  post : doPost,
  postJson : doPostJson,
  put : doPut,
  putJson : doPutJson,
  del : doDelete
};
