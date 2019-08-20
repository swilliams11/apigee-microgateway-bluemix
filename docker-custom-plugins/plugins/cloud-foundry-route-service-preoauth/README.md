# cloud-foundry-route-service-preoauth

## Summary
This plugin updates the `req.reqUrl.path` so that it matches what the Microgateway OAuth plugin expects.

When you run requests inside of IBM Bluemix Cloud Foundry (CF), the you must configure a route service and bind that route service to app.  The OAuth plugin validates the URI path to ensure it is listed in the product.  This plugin changes the URI path to what the oauth plugin expects.  

In this repo, requests are sent to the MG app as `/edgemicro-app-demo.mybluemix.net`, but the oauth plugin expects `/edgemicro-app-demo.mybluemix.net/hello`.  This plugin sets the `req.reqUrl.path` property to the `x-cf-forwarded-url`

You must have this plugin included before the `oauth` plugin.  
