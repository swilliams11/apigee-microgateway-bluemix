# Microgateway and Docker for Google Cloud Platform with Custom Plugins

## Summary
This folder contains a modified Docker file
* port 8443 removed in order to prevent startup errors when only HTTP is needed
* and the Docker file copies the plugins directory into the docker image.

This directory demonstrates how to create a Microgateway Docker image with custom plugins included.  

Your custom plugins should be placed in the [plugins](plugins) folder.  Make sure to execute `npm install` in the custom plugin directory before you submit the Docker build.  

## Build Docker image with Google Cloud Platform
```
gcloud builds submit --tag gcr.io/[PROJECT_ID]/edgemicro:latest .
```

It is a **best practice** to not use the latest tag, but to specify a revision number instead.
```
gcloud builds submit --tag gcr.io/[PROJECT_ID]/edgemicro:v1 .
```
