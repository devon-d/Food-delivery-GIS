# Food Delivery CesiumJS-MVP  `v1.0.0`

Cesiumjs based drawing tool

## Built With  
  
* [Angular](https://angular.io/) - The web framework used  
* [Nodejs](https://nodejs.org/) - For backend
* [Yarn](https://yarnpkg.com/) - For package management  
  
## Getting Started  
  
These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. 
  
### Prerequisites  

- [Nodejs](https://nodejs.org/en/download/) 
- [Yarn](https://classic.yarnpkg.com/en/docs/install)  `npm install -g yarn`
- [Angular CLI](https://cli.angular.io/) `npm install -g @angular/cli`
- [PostgreSQL](https://www.postgresql.org/download/)
  
### Installing  
 1. Clone repository from github: `git clone https://github.com/devon-d/Food-delivery-GIS.git`
 2. Run `yarn install` in root folder.
 
### DB Setup:
 1. Install and set up your PostgreSQL server instance
 2. Create a new database named `flytrex` under PostgresSQL server. 
 2. Replace values in `/config/config.json` file, according to your instance, for following keys:
    - username `(default: postgres)`
    - password `(default: check@123)`
    - database `(default: flytrex)`
    - host `(default: localhost)`
    - port `(default: 5432)`

### DB Migration:
- Production: `yarn migrate`
- Development: `yarn migrate:dev`
- For any other environment: `yarn migrate:env env_name`

Note: DB environments can be found in config/config.json
 
### Running in Development Environment:

First you have to add a custom host in your host file (To avoid cookie issue with flytrex.com).

Add `127.0.0.1 localhost.flytrex.com` at the end of your hosts file in:
- Mac/Linux: `/etc/hosts`
- Windows: `C:\Windows\System32\drivers\etc\hosts`

NOTE: For Chrome browser you should disable this flag `chrome://flags/#schemeful-same-site`

Then follow these steps to run in development environment:

1. Run `yarn dev` in root folder (takes some time to finish)
2. Open the app on http://localhost.flytrex.com:4200 

The website will run on localhost port 4200 and the server will be listening on port 4040. 

### Create Build:

- <b>Dev Build</b>

Make sure you have added the custom host as mentioned in above section and then follow these steps to build & run in development environment:

1. Run `yarn deploy:dev` in root folder. (takes some time to finish)
3. Open the app on http://localhost.flytrex.com:4040 
  
- <b>Production Build</b>

Follow these steps to build & run in production environment:

1. Uncomment production variables in .env file (remove # to uncomment)
2. Run `yarn deploy` in root folder. (takes some time to finish)
4. Open the app on http://localhost:4040 

## Import OpenAddresses dataset:
- Go to `<postgresql_installation_dir>/data` folder and open `pg_hba.conf`
- Add a new line at the top with following values:
    * TYPE: local
    * DATABASE: all
    * USER: all
    * ADDRESS: empty
    * METHOD: trust
- Save the file and restart the postgres server
- Run `yarn import-addresses "<path-to-dataset>"` in root folder of the project to import datasets. For example: run `yarn import-addresses "/Users/admin/downloads/us/*/*.geojson"` to recurse through all sub-folders of the "US" folder and import all .geojson files inside them
- Wait for above command to finish
- Repeat above steps for all datasets

## How to Create .htpasswd file
 
1. Run `npm install -g htpasswd`
2. Run `htpasswd -c -B .htpasswd myuser`. (Replace `myuser` with your desired username)
3. Copy the newly created .htpasswd file to `configs` folder

## Environment Variables  
1.  **For server:**
	- NODE_ENV= either development or production
	- PORT= express server port  
	- SESSION_SECRET= A random string used to sign the session ID cookie in express-session. Use [RandomKeygen](https://randomkeygen.com/)

## Health Check URL

Use this endpoint to check whether the server is up and running: http://localhost:4040/health/check

Returns `{"status":"UP"}` with status code 200
