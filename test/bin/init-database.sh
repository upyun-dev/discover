#!/bin/bash
apt-get update -y && apt-get upgrade -y && apt-get install -y mysql*

mysql -uroot <<EOF
create database discover1;
create database discover2;
EOF