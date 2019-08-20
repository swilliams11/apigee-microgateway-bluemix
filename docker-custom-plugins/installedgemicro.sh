#!/bin/sh

set echo off

    mkdir -p /opt/apigee/logs && \
    mkdir -p /opt/apigee/plugins && \
    #chown apigee:apigee /opt/apigee/plugins/plugins.zip && \
    #unzip -qq /opt/apigee/plugins/plugins.zip -d /opt/apigee/plugins && \
    chown -R apigee:apigee /opt/apigee/plugins
    edgemicro init && \
    chmod +x /opt/apigee/entrypoint.sh
