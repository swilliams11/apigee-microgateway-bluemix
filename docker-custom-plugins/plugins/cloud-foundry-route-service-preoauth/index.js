'use strict'
var debug = require('debug')('plugin:cloud-foundry-route-service-preoauth');
var https = require('https');
/*
 * Copyright 2016 Apigee Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//var pathOnly = false;

/**
 * Changes target host/path according to Cloud Foundry "magic header".
 *
 * @module
 */

function retarget (req, res, next) {
  const cfurl = req.headers['x-cf-forwarded-url']
  if (! cfurl) {
    next()
    return
  }

  let h = cfurl.indexOf('://')
  if (h >= 0) {
    h += 3
  }
  else {
    h = 0
  }

  let p = cfurl.indexOf('/', h)
  if (p < 0) {
    p = cfurl.length
  }

  const cfHostname = cfurl.slice(h, p)
  const cfPath = cfurl.slice(p) || '/'

  debug('x-cf-forwarded-url: ' + cfurl);
  debug('req.reqUrl.path: ' + req.reqUrl.path);

  req.reqUrl.path = '/' + cfHostname + cfPath;
  debug('new req.reqUrl.path: ' + req.reqUrl.path);
  next()
}

module.exports.init = function (config, logger, stats) {
  //this variable will allow the override of only the targetPath
  //why is this useful?: it is possible for a cf app to have multiple
  //routes (ex: an internal route available only from within the
  //corp network vs. an external route available from the internet).
  //the hostname that is set during the route-bind-services cmd maybe
  //external route. however, MG need not use that route the request.
  //it can optimize and use an internal route (which the developer can
  //specify in as the target endpoint in the API Proxy). In short,
  //external consumers will still access the app from the external route
  //but instead of MG forwardinf the request back to the external route,
  //it will use an internal route (if the proxy endpoint had such a target)
  //pathOnly = config['pathOnly'] || false;

  return {
    onrequest: retarget
  }
}
