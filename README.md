# apigee-microgateway-bluemix

The purpose of this repository is to document how to protect your apps running in [IBM Bluemix SaaS](https://www.ibm.com/cloud/) with Apigee Microgateway.  

* Why can't I use the [Apigee Service Broker](https://docs.apigee.com/api-platform/integrations/cloud-foundry/edge-integration-pivotal-cloud-foundry)?
  IBM Bluemix SaaS does not allow you to add the Apigee Service Broker.  If you have IBM Bluemix on-premise, then you can install the Apigee Service Broker from source.
* Can I use the [Edge Microgateway Decorator](https://github.com/swilliams11/edgemicro-decorator)?
  The Edge Microgateway Decorator was the previous incarnation of the Apigee Service Broker - Microgateway Coresident plan.  This decorator requires the [cf-metabuildpack](https://github.com/cf-platform-eng/meta-buildpack). IBM Bluemix SaaS does not allow you to modify the buildpacks, therefore, you can't upload the meta-buildpack or the Edge Microgateway Decorator.
* Can I just execute `cf push -b https://github.com/cf-platform-eng/meta-buildpack`?
  No, this command does not work either. It still has to upload the meta-buildpack to your SaaS organization and this is not allowed.

# TOC
* [Summary](#summary)
* [Prerequisites](#prerequisites)
* [Protect your IBM Bluemix app with Apigee Microgateway hosted as a Docker image with custom plugins](#steps-to-protect-your-ibm-bluemix-saas-app-with-apigee-microgateway-docker-image)
  * This is the best practice approach to managing multiple Microgateway instances in a Cloud Foundry based environment. Microgateway is deployed from a Docker image hosted within a container registry.  
  * This approach uses 3 plugins
    * [cloud-foundry-route-service-preoauth](docker-custom-plugins/plugins/cloud-foundry-route-service-preoauth) which updates the request URI path to the `x-cf-forwarded-for` url.
    * oauth to protect your Microservice with the API Keys or JWTs.
    * [cloud-foundry-route-service](https://github.com/apigee/microgateway-plugins/tree/master/cloud-foundry-route-service) which changes the target path to the correct path expected by your CF app.  
* [Deploy a custom Microgateway image without custom plugins](#deploy-a-custom-microgateway-image-without-any-custom-plugins)
  * This demonstrates how to deploy MG as a Docker image without custom plugins.  
* [Deploy Microgateway as a app with the default Google/Apigee docker image ](#deploy-the-default-microgateway-image-without-any-custom-plugins)
  * This demonstrates how to deploy the default MG docker image which is hosted in Google Container Registry.
* [Google Container Registry](#google-container-registry)
  * Read this section if you need to know how to make the Google Container Registry (GCR) public or if you need to know how to access private images in GCR from a `manifest.yaml` file.
* [Deploy Microgateway by cloning the Microgateway repository](#demo-of-apigee-microgateway-with-ibm-bluemix-app-without-oauth-plugin)
  * This was the original documentation and is included here for posterity, but it is not a best practice to use this approach. Please use the [Protect your IBM Bluemix app with Apigee Microgateway hosted as a Docker image with custom plugins](#steps-to-protect-your-ibm-bluemix-saas-app-with-apigee-microgateway-docker-image)

# Summary
Applications hosted in IBM Bluemix SaaS should use a suitable API management platform to expose those services.  This repository describes how to protect your IBM Bluemix SaaS applications with the Apigee Edge Microgateway. Developers can protect their applications by creating a user defined service instance, and binding that instance to your Bluemix application.  All of these steps will need to be repeated for each Bluemix application that you create so consider automating this with a CI/CD tool, such as Jenkins or Concourse.

# Prerequisites
* [Apigee Edge SaaS](https://login.apigee.com/sign__up) or Apigee Private Cloud
* [Apigee Microgateway](https://www.npmjs.com/package/edgemicro)
* [IBM Bluemix SaaS](https://idaas.iam.ibm.com/idaas/mtfim/sps/authsvc?PolicyId=urn:ibm:security:authentication:asf:basicldapuser)
* [IBM Bluemix CLI](https://developer.ibm.com/courses/labs/1-install-bluemix-command-line-interface-cli-dwc020/)
* [Node.js](https://nodejs.org/en/)
* [OpenSSL](https://www.openssl.org/)
* You need to understand the Apigee and Microgateway concepts.
* You should know how to create an Apigee Edge proxy.

## Install and Configure the Microgateway
1. Install Apigee Microgatway globally.
`npm install edgemicro -g`

2. Configure the Microgateway with your Apigee organization, environment and username and password.
`edgemicro configure -o apigeeorg -e test -u youremail@email.com`

**If you don't enter the password on the command line it will prompt you for it.**

The above command will create a `.edgemicro` directory in your home folder with a file named `yourorg-yourenv-config.yaml`.
This yaml file is the Microgateway configuration.  It will also provide you a key and secret that must be used to start the Microgateway and you must include them both in the `manifest.yaml` file.  

## Create the Edgemicro aware proxy in Apigee Edge
You must create an Edgemicro aware proxy in Apigee Edge so that the Microgateway can proxy requests.  When you create this proxy the Microgateway will pull down the proxy configuration and will accept requests to the basepath `bluemix-sample-app-YOURINITIALS-mybluemix-net`.

1. login to Apigee Edge (SaaS or private cloud)

2. Create a new proxy.
   * proxy name: edgemicro_bluemix-sample-app-YOURINITIALS-mybluemix-net
   * basepath: bluemix-sample-app-YOURINITIALS-mybluemix.net
   * target: https://bluemix-sample-app-YOURINITIALS.mybluemix.net

3. Save the proxy.

## Create the Apigee product and app
1. Create a new product in Apigee and add the Edgemicro aware proxy that you created above and also include the `edgemicro-auth` proxy.  
* You can include the exact path `/hello` or you can use `/**` to allow all paths.
* For the `edgemicro-auth` proxy you can include the /verifyApiKey

2. Create an Apigee app that includes the product from step one.  This will give you a client ID and secret.  For this demo we will only use the client ID.  

# Steps to Protect your IBM Bluemix SaaS App with Apigee Microgateway Docker image
**Please complete the prerequisites listed above first.**

The recommended best practice to manage multiple Microgateway instances in a Cloud Foundry based environment is to use the Microgateway Docker image.  

This section describes how to deploy Microgateway as an app from a Docker registry and protect your IBM Bluemix application with the `oauth` plugin.  It uses a custom plugin located in the [docker-custom-plugins/plugins](docker-custom-plugins/plugins) directory.

## Deploy a custom Microgateway image with a custom plugin

1. You will create your own Microgateway Docker image and deploy to your own Docker registry.  This example use Google Container Register.  
2. Deploy the Microgateway  as an app.
3. Configure Cloud Foundry with a user defined service instance.  


### 1) Create Microgateway Docker image
```
cd docker-custom-plugins
```

Create a [project in Google Cloud Platform](https://cloud.google.com/resource-manager/docs/creating-managing-projects).

Create the docker image in Google Container Registry with the following command.  This will copy all plugins in the plugins directory into the image and create the image in Google Container Registry.  The documentation for the `cloud-foundry-route-service-preoauth` plugin is located in the  [`cloud-foundry-route-service-preoauth`](docker-custom-plugins/plugins/cloud-foundry-route-service-preoauth) directory.  
```
gcloud builds submit --tag gcr.io/[PROJECT_ID]/edgemicro:v1 .
```

**Review the [Google Container Registry](#google-container-registry) section for instructions on how to make a GCR image public or to understand how to access a private GCR image.**

### 2) Deploy the Microgateway as an app in Bluemix
```
cd microgateway-app-custom-plugins
```

Copy your Microgateway config file (`org-env-config.yaml`) into this directory.  

Update your Microgateway config file plugins section as shown below.
```
plugins:
  sequence:
    - cloud-foundry-route-service-preoauth # sets the correct resource path for the oauth plugin
    - oauth
    - cloud-foundry-route-service
```

Base64 encode your Microgateway config file.
```
base64 org-env-config.yaml
```

Update the `manifest.yaml` file with the following entries.  
```
env:
  EDGEMICRO_KEY: 'microgateway-key'
  EDGEMICRO_SECRET: 'microgateway-secret'
  EDGEMICRO_CONFIG: 'base64(config_file)'
  EDGEMICRO_ENV: 'env-name'
  EDGEMICRO_ORG: 'org-name'
  EDGEMICRO_PORT: 8080
  EDGEMICRO_PROCESSES: 2 # you should restrict the number of worker threads that are created in the container
  #DEBUG: '*' # turn on debugging
docker:
  image: YOUR_CONTAINER_REGISTRY_GOES_HERE/edgemicro:v1 # i.e. if you are using Google Container Registry gcr.io/YOUR_GCP_PROJECT/edgemicro:v1
```

Deploy the microgateway app.
```
bx cf push
```
or
```
bx cf push -f manifest.yaml
```

### 3) Configure Cloud Foundry based environment with user provided service
Now create the user provided route service. This means that requests to the sample application will be forwarded to Edge Microgateway -> https://edgemicro-app-bluemix.mybluemix.net/cf-nodejs.mybluemix.net.  

1. Create the user provided route service. Notice that the base path bluemix-sample-app-sw.mybluemix.net is the same as the target service that we are going to create next.  This command creates a user provided service named `bluemix-mg` with a route (-r) of https://edgemicro-app-bluemix.mybluemix.net/cf-nodejs.mybluemix.net.

```
bx cf create-user-provided-service bluemix-mg -r https://edgemicro-app-bluemix.mybluemix.net/cf-nodejs.mybluemix.net
```

#### Push a sample app to Bluemix

1. Switch to the `hello-app` directory
```
cd hello-app
```

2. `bx cf push`
This will push the app with the hostname of `cf-nodejs`.  

3. Bind the app to the route service.
```
bx cf bind-service cf-nodejs bluemix-mg
```

##### Unbind the service
You can execute the following command to unbind the service when you are ready to delete it.  
```
bx cf unbind-service cf-nodejs bluemix-mg
```

#### Bind the route to a service instance
The documentation for route binding is https://docs.cloudfoundry.org/devguide/services/route-binding.html.  

1. Bind the route service bluemix-mg to the sample app we just created.
```
bx cf bind-route-service mybluemix.net bluemix-mg --hostname cf-nodejs
```

##### Unbind route from service
Execute this command when you are ready to delete the route service.

```
bx cf unbind-route-service mybluemix.net bluemix-mg --hostname cf-nodejs
```


# Deploy a custom Microgateway image without any custom plugins
This section describes how to deploy a custom Microgateway image without any custom plugins and assumes you are using the Google Cloud Platform's container registry.  This section deploys Microgateway without an oauth plugin included in the plugins section in Microgateway configuration file. Please don't use this approach in production unless your are sure you don't want your Microgateway to authorize requests.    

### 1) Deploy the Microgateway as an app in Bluemix
```
cd docker
```
You can customize the Docker file.

Create a [project in Google Cloud Platform](https://cloud.google.com/resource-manager/docs/creating-managing-projects).

Create the docker image in Google Container Registry with the following command.  This will copy all plugins in the plugins directory into the image and create the image in Google Container Registry.  The documentation for the [`cloud-foundry-route-service-preauth`](plugins/cloud-foundry-route-service-preauth) directory.  
```
gcloud builds submit --tag gcr.io/[PROJECT_ID]/edgemicro:v1 .
```
**Review the [Google Container Registry](#google-container-registry) section for instructions on how to make a GCR image public or to understand how to access a private GCR image.**

### 2) Deploy the Microgateway as an app in Bluemix
```
cd microgateway-app
```

Copy your Microgateway config file (`org-env-config.yaml`) into this directory.  

Update your Microgateway config file plugins section as shown below.
```
plugins:
  sequence:
    - cloud-foundry-route-service
```

Base64 encode your Microgateway config file.
```
base64 org-env-config.yaml
```

Update the `manifest.yaml` file with the following entries.  
```
env:
  EDGEMICRO_KEY: 'microgateway-key'
  EDGEMICRO_SECRET: 'microgateway-secret'
  EDGEMICRO_CONFIG: 'base64(config_file)'
  EDGEMICRO_ENV: 'env-name'
  EDGEMICRO_ORG: 'org-name'
  EDGEMICRO_PORT: 8080
  EDGEMICRO_PROCESSES: 2 # you should restrict the number of worker threads are created in the container
  #DEBUG: '*' # turn on debugging
docker:
  image: YOUR_CONTAINER_REGISTRY_GOES_HERE/edgemicro:v1 # i.e. if you are using Google Container Registry gcr.io/YOUR_GCP_PROJECT/edgemicro:v1
```

Deploy the microgateway app.
```
bx cf push
```
or
```
bx cf push -f manifest.yaml
```


# Deploy the default Microgateway image without any custom plugins
You can use the Microgateway Docker image located at https://gcr.io/apigee-microgateway/edgemicro:latest

## 1) Deploy the Microgateway as an app in Bluemix
```
cd microgateway-default
```

Copy your Microgateway config file (`org-env-config.yaml`) into this directory.  

Update your Microgateway config file plugins section as shown below.
```
plugins:
  sequence:
    - cloud-foundry-route-service
```

Base64 encode your Microgateway config file.
```
base64 org-env-config.yaml
```

Update the `manifest.yaml` file with the following entries.  
```
env:
  EDGEMICRO_KEY: 'microgateway-key'
  EDGEMICRO_SECRET: 'microgateway-secret'
  EDGEMICRO_CONFIG: 'base64(config_file)'
  EDGEMICRO_ENV: 'env-name'
  EDGEMICRO_ORG: 'org-name'
  EDGEMICRO_PORT: 8080
  EDGEMICRO_PROCESSES: 2 # you should restrict the number of worker threads are created in the container
  #DEBUG: '*' # turn on debugging
```

Deploy the microgateway app.
```
bx cf push
```
or
```
bx cf push -f manifest.yaml
```

# Google Container Registry
Google Container Registry (GCR) images are private by default.  Follow the steps listed in the [serving images publicly](https://cloud.google.com/container-registry/docs/access-control#serving_images_publicly) documentation to make the registry public.  

## Access a private GCR
All images uploaded to GCR are private by default.  If your image is private and you need to access it from your `manifest.yaml` file then you should complete the steps below which are summarized from [GCR access control](https://cloud.google.com/container-registry/docs/access-control) and [Cloud Foundry App Manifest](https://docs.cloudfoundry.org/devguide/deploy-apps/manifest-attributes.html#docker).

1. Create a Google service account with a read-only pull permission (Storage Object Viewer; roles/storage.objectViewer).
2. Download the Google JSON key from Google.
3. Update the App `manifest.yaml` to include the following
```
docker:
    image: docker-image-repository/docker-image-name
    username: GCP_service_account
```
4. You can use one of the following approaches for the docker password.
* include an environment variable named `CF_DOCKER_PASSWORD` with the content of the Google key file
```
env:
    CF_DOCKER: docker-image-repository/docker-image-name
    username: docker-user-name
    CF_DOCKER_PASSWORD: 'CONTENT_OF_GOOGLE_JSON_KEY'
```
* use variable substitution in the app manifest.
```
env:
    CF_DOCKER: docker-image-repository/docker-image-name
    username: docker-user-name
    CF_DOCKER_PASSWORD: ((docker_password))
```
Then use the following command line
```
bx cf push --vars-file /PATH/vars.yml
```
or
```
bx cf push --var docker_password=$(cat /PATH/google_key.json)
```

# Demo of Apigee Microgateway with IBM Bluemix App without OAuth plugin
**Please complete the prerequisites listed above first.**

This section describes how to deploy Microgateway as an app in front of your IBM Bluemix application.
You clone the Microgateway repository and push that to your IBM Bluemix org and space.  

## Benefits/Drawbacks
### Benefits
* uses the most current Microgateway app
* allows you to easily include custom plugins in the plugins directory

### Drawbacks
* requires a significant amount of time to upload all files in the Microgateway directory to IBM Bluemix SaaS
* difficult to maintain across multiple teams
* limits governance of Microgateway versions

Due to the drawbacks I recommend that you manage [Microgateway as Docker image](#steps-to-protect-your-ibm-bluemix-saas-app-with-apigee-microgateway-docker-image) instead.

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
