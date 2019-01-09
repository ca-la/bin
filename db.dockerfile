FROM postgres:10.6-alpine
COPY 001-init-user-db.sh /docker-entrypoint-initdb.d/001.sh
