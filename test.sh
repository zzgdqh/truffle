#!/usr/bin/env bash

# The below tells bash to stop the script if any of the commands fail
set -ex

env | grep -i npm_config_registry

npm login
