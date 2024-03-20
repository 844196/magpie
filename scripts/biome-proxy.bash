#!/usr/bin/env bash

pwd="$(cd -P -- "$(dirname -- "$(command -v -- "$0")")" && pwd -P)"

exec "$(aqua --config $pwd/../aqua.yaml which biome)" "$@"
