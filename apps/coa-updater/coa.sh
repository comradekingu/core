#!/usr/bin/env bash
set -x

chmod 777 /tmp

LOCAL_IP=`/sbin/ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1'`

GIT_REPO=https://github.com/bperel/DucksManager
CONFIG_ROOT=/home/coa
CONFIG_FILE=coa.properties

TEMP_DIR=/tmp/coa-box
ISV_SUBDIR=inducks/isv
DM_SUBDIR=html/DucksManager

WEB_DIRECTORY_ROOT=/var/www

BASH_RC_FILE=~/.bashrc
DB_CONF_FILE=Database.priv.class.php
APACHE_CONF_FILE=/etc/apache2/apache2.conf
SPARSE_CHECKOUT_CONF_FILE=.git/info/sparse-checkout

/bin/cat <<EOM >${BASH_RC_FILE}
alias ll='ls -la'
export LC_CTYPE=en_US.UTF-8
export LC_ALL=en_US.UTF-8
EOM

# Config file copy and load

mkdir -p ${CONFIG_ROOT} && cp ${TEMP_DIR}/${CONFIG_FILE} ${CONFIG_ROOT}
. ${CONFIG_ROOT}/${CONFIG_FILE}

# Config file copy - end

apt-get install -y git python-software-properties
apt-key adv --recv-keys --keyserver keyserver.ubuntu.com 0xcbcb082a1bb943db
add-apt-repository 'deb http://ftp.ddg.lth.se/mariadb/repo/10.0/debian wheezy main'

apt-get update
apt-get -y install apache2 php5 php5-mysqlnd p7zip p7zip-full

# MariaDB install

debconf-set-selections <<< "mysql-server mysql-server/root_password password ${DB_PASSWORD}"
debconf-set-selections <<< "mysql-server mysql-server/root_password_again password ${DB_PASSWORD}"

apt-get -y install mariadb-client mariadb-server

mysql --user=root -e 'CREATE DATABASE IF NOT EXISTS `coa` /*!40100 DEFAULT CHARACTER SET utf8 */;'
mysql --user=root -e 'CREATE DATABASE IF NOT EXISTS `db301759616` /*!40100 DEFAULT CHARACTER SET utf8 */;'

# MariaDB install - end

# Web directory install incl. Git sparse checkout

cd ${WEB_DIRECTORY_ROOT}
mkdir -p ${DM_SUBDIR} && cd ${DM_SUBDIR}

git init
git remote add origin ${GIT_REPO}
git config core.sparsecheckout true
/bin/cat <<EOM >${SPARSE_CHECKOUT_CONF_FILE}
remote/auth.php
remote/cron_inducks.sh
remote/import_inducks.php
remote/sql.php
locales
Database.class.php
Inducks.class.php
Util.class.php
EOM

git pull origin master

mkdir -p ${WEB_DIRECTORY_ROOT}/${DM_SUBDIR}/_priv
cp ${TEMP_DIR}/${DB_CONF_FILE} ${WEB_DIRECTORY_ROOT}/${DM_SUBDIR}/_priv/${DB_CONF_FILE}
sed -i "s/my_password/${DB_PASSWORD}/g" ${WEB_DIRECTORY_ROOT}/${DM_SUBDIR}/_priv/${DB_CONF_FILE}
sed -i "s/my_ip/${LOCAL_IP}/g" ${WEB_DIRECTORY_ROOT}/${DM_SUBDIR}/_priv/${DB_CONF_FILE}

# Web directory install incl. Git sparse checkout - end

echo "Import done, starting services..."

service apache2 start
service mysql start

echo "Services started, machine is ready."

mkdir -p ${WEB_DIRECTORY_ROOT}/archive

echo "Populating Inducks database for the first time"
