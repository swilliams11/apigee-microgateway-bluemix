# apigee-microgateway-bluemix

The purpose of this repository is to document how to protect your apps running in [IBM Bluemix SaaS](https://www.ibm.com/cloud/) with Apigee Microgateway.  

* Why can't I use the [Apigee Service Broker](https://docs.apigee.com/api-platform/integrations/cloud-foundry/edge-integration-pivotal-cloud-foundry)?
  IBM Bluemix SaaS does not allow you to add the Apigee Service Broker.  If you have IBM Bluemix on-premise, then you can install the Apigee Service Broker from source.
* Can I use the [Edge Microgateway Decorator](https://github.com/swilliams11/edgemicro-decorator)?
  The Edge Microgateway Decorator was the previous incarnation of the Apigee Service Broker - Microgateway Coresident plan.  This decorator requires the [cf-metabuildpack](https://github.com/cf-platform-eng/meta-buildpack). IBM Bluemix SaaS does not allow you to modify the buildpacks, therefore, you can't upload the meta-buildpack or the Edge Microgateway Decorator.
* Can I just execute `cf push -b https://github.com/cf-platform-eng/meta-buildpack`?
  No, this command does not work either. It still has to upload the meta-buildpack to your SaaS org, which is not allowed.


# Summary
The following steps describe how to protect your IBM Bluemix SaaS apps with Apigee Edge Microgateway. This is accomplished by creating a user defined service instance, and binding the user defined service instance to your Bluemix app.  All of these steps will need to be repeated for each Bluemix app that you create.

# Prereqs
* [Apigee Edge SaaS](https://login.apigee.com/sign__up) or Apigee Private Cloud
* [Apigee Microgateway](https://www.npmjs.com/package/edgemicro)
* [IBM Bluemix SaaS](https://idaas.iam.ibm.com/idaas/mtfim/sps/authsvc?PolicyId=urn:ibm:security:authentication:asf:basicldapuser)
* [IBM Bluemix CLI](https://developer.ibm.com/courses/labs/1-install-bluemix-command-line-interface-cli-dwc020/)
* [Node.js](https://nodejs.org/en/)
* [OpenSSL](https://www.openssl.org/)
* You need to understand the Apigee concepts and Microgateway concepts as well.
* You should know how to create an Apigee Edge proxy.

# Steps to Protect your IBM BLuemix SaaS App with Apigee Microgateway

## Install and Configure the Microgateway
1. Install Apigee Microgatway globally.
`npm install edgemicro -g`

2. Configure the Microgateway with your Apigee organization, environment and username and password.
`edgemicro configure -o apigeeorg -e test -u youremail@email.com`

**If you don't enter the password on the command line it will prompt you for it.**

The above command will create a `.edgemicro` directory in your home folder with a file named `yourorg-yourenv-config.yaml`.
This yaml file is the Microgateway configuration.

## Create the Edgemicro aware proxy in Apigee Edge
You must create an Edgemicro aware proxy in Apigee Edge so that the Microgateway can proxy requests.  When you create this proxy the Microgateway will pull down the proxy configuration and will accept requests to the basepath `bluemix-sample-app-YOURINITIALS-mybluemix-net`.

1. login to Apigee Edge (SaaS or private cloud)

2. Create a new proxy.
   * proxy name: edgemicro_bluemix-sample-app-YOURINITIALS-mybluemix-net
   * basepath: bluemix-sample-app-YOURINITIALS-mybluemix.net
   * target: https://bluemix-sample-app-YOURINITIALS.mybluemix.net

3. Save the proxy.


## Clone the Microgateway repository and update the Microgateway config yaml file
1. `git clone https://github.com/apigee-internal/microgateway.git`
2. `cd microgateway`
3. `git checkout tags/v.2.5.19`
4. `mkdir config`
5. Copy the `yourorg-yourenv-config.yaml` into the `config` directory that you just created.
6. Open the Microgateway yaml file and make sure your plugins sequence looks similar to the one below.
   Make sure that the `cloud-foundry-route-service` route service plugin is created.  This removes the oauth plugin and is for demonstration purposes only.  

```
plugins:
  sequence:
    - cloud-foundry-route-service
```

7. Update the `manifest.yaml` file located in the `microgateway` directory as shown below.

```
applications:
- name: edgemicro-app-bluemix
  memory: 512M
  instances: 1
  host: edgemicro-app-bluemix
  path: .
  buildpack: nodejs_buildpack
  env:
    EDGEMICRO_KEY: 'YOUR_KEY'
    EDGEMICRO_SECRET: 'YOUR_SECRET'
    EDGEMICRO_CONFIG_DIR: '/app/config'
    EDGEMICRO_ENV: 'test'
    EDGEMICRO_ORG: 'YOUR_APIGEE_ORG_NAME'
```

8. Push Edge Microgateway to Bluemix as an app.  
   `bx cf push`

9. Now microgateway should be listening at https://edgemicro-app-bluemix.mybluemix.net.

##  Create a User Provided Service
Now create the user provided route service. This means that requests to the sample application will be forwarded to Edge Microgateway -> https://edgemicro-app-bluemix.mybluemix.net/bluemix-sample-app-YOURINITIALS.mybluemix.net.  

1. Create the user provided route service. Notice that the base path bluemix-sample-app-sw.mybluemix.net is the same as the target service that we are going to create next.  This command creates a user provided service named `bluemix-mg` with a route (-r) of https://edgemicro-app-bluemix.mybluemix.net/bluemix-sample-app-YOURINITIALS.mybluemix.net.

```
bx cf create-user-provided-service bluemix-mg -r https://edgemicro-app-bluemix.mybluemix.net/bluemix-sample-app-YOURINITIALS.mybluemix.net
```

## Push a sample app to Bluemix

1. Clone this repository.
```
git clone https://github.com/apigee/cloud-foundry-apigee.git
```

2. cd into the directory that you just cloned.
`cd cloud-foundry-apigee/samples/org-and-microgateway-sample`

3. Update the manifest file.
```
applications:
- name: bluemix-sample-app-YOURINITIALS
  memory: 600M
  instances: 1
  host: bluemix-sample-app-YOURINITIALS
  path: .
  buildpack: nodejs_buildpack
```

4. `bx cf push`

5. Bind the app to the route service.
```
bx cf bind-service bluemix-sample-app-YOURINITIALS bluemix-mg
```

### Unbind the service
You can execute the following command to unbind the service when you are ready to delete it.  
```
bx cf unbind-service bluemix-sample-app-YOURINITIALS bluemix-mg
```

## Bind the route to a service instance
The documentation for route binding is https://docs.cloudfoundry.org/devguide/services/route-binding.html.  

1. Bind the route service bluemix-mg to the sample app we just created.
```
bx cf bind-route-service mybluemix.net bluemix-mg --hostname bluemix-sample-app-YOURINITIALS
```

### DO NOT USE
```
bx cf bind-route-service mybluemix.net bluemix-mg --hostname bluemix-sample-app-YOURINITIALS --path bluemix-sample-app-YOURINITIALS.mybluemix.net
```

### Unbind route from service
Execute this command when you are ready to delete the route service.

```
bx cf unbind-route-service mybluemix.net bluemix-mg --hostname bluemix-sample-app-YOURINITIALS
```

## View the CF logs
You can tail the logs to validate everything is working correctly.  

1. Open a terminal tab and execute the following.
```
bx cf logs bluemix-sample-app-YOURINITIALS
```

2. Open a new terminal tab and execute the following.
```
bx cf logs edgemicro-app-bluemix
```

## Test

1. Execute the following command and you will see the request is routed to Apigee Microgateway.

```
curl bluemix-sample-app-YOURINITIALS.mybluemix.net/hello
```

2. View the logging terminal tab of the Microgateway and you should see the request there.

3. View the logging terminal tab of the sample app and you should see the request there as well.


# This is not an official Google product
