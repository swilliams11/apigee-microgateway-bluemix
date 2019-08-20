# Microgateway app

## Summary
This manifest demos how to deploy Microgateway (MG) using the default Microgateway image.
* gcr.io/apigee-microgateway/edgemicro:latest

## Prerequistes

### Login to IBM Bluemix
```
ibmcloud login -a https://api.ng.bluemix.net -u username
```

### Target Org and Space
```
bx target --cf-api ENDPOINT [-o ORG] [-s SPACE]
```

## Details

### Prerequisites
1. Build a new docker image and deploy to Google Container Register (see the  [README in the docker folder](../)).
2. Deploy a sample [Node.js hello world app](../hello-app).

### 1) Update manifest.yaml
Update the following in the `manifest.yaml` file.
1. Include the Microgateway key and secret that was created when you configured MG.
2. Include your Apigee organization and environment.
3. Update the `EDGEMICRO_CONFIG` with your MG configuration file base64 encoded.
4. Update the `docker image` property to refer to the Microgateway image in your Google Container Registry.

### 2) Apigee Microgateway configuration file
```
base64 org-env-config.yaml
```

### 3) Push the app to IBM Cloud
```
bx cf push -f manifest.yaml
```
or
```
bx cf push
```
