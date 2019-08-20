#!/bin/sh

set echo off

    mkdir -p /opt/apigee/logs && \
    mkdir -p /opt/apigee/plugins && \
    edgemicro init && \
    chmod +x /opt/apigee/entrypoint.sh