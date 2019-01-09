#!/bin/bash
set -e

PGUSER=postgres createdb cala && createdb cala-test
