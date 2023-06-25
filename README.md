# Container Based Nginx Nodejs CouchDB Authentication, Authorization, Accounting Boilerplate Web Service System

## Summary
Open source nginx, nodejs, and couchdb servers are configured to run in Docker containers via the included compose.yaml file. Host folders are bind mounted enabling live code updates (e.g. nodemon) without requiring container restarts/rebuilds.

Nginx is the front end reverse proxy cache engine. Nodejs' http module is minimally configured as a web server. CouchDB is the document database.

![image](./nodejs/public/media/topology.png)

## Getting Started

### 1. Install Docker on the Host
Install Docker Desktop or Docker Engine on the host computer. The Docker software is available at https://www.docker.com/.

### 2. Install and Initialize Git on the Host
Install and then initialize Git on the host computer by issuing `git init`. Clone this repository to your host.

### 3. Run the System
Open up a terminal at the directory containing the `compose.yaml` file and issue the command `docker compose --env-file .env up --detach` to build and run the system of servers in development mode. For more information see https://docs.docker.com/engine/reference/commandline/compose_up/. The couchdb adminitrator graphical user interface is available at `http://localhost:5984` and the homepage is available at `http://localhost`.