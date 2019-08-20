# Microgateway and Docker for Google Cloud Platform

## Summary
This folder contains a modified Docker file with port 8443 removed in order to prevent startup errors when only HTTP is needed. It also describes how to build a Docker image with gcloud.  If you need to customize the Microgateway Docker image then use this directory.  If you need to use custom plugins then use the [docker-custom-plugins](../docker-custom-plugins) directory.  

## Build Docker image with Google Cloud Platform
```
gcloud builds submit --tag gcr.io/[PROJECT_ID]/edgemicro:latest .
```

It is a **best practice** to not use the latest tag, but to specify a revision number instead.
```
gcloud builds submit --tag gcr.io/[PROJECT_ID]/edgemicro:v1 .
```
