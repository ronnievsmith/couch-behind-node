import db from './db.mjs';
import 'dotenv/config';

	//userCallOptions
	// rewrite /couch to :5984/
		//throw error if they try and name db a reserved db name
	// read the endpoint
		//is there a security object present on the database? we know db by depth of arg in path
		//is there a security object present on the document? 
		//is there a security object on the field?

const initOptions = {
	hostname: process.env.COUCHDB_HOSTNAME,
	port: 5984,
	//path: '/buckets/' + bucketDoc["_id"] + "/" + encodeURIComponent(filename),
	//method: 'PUT',
	//headers: {
		//"Authorization" : "Basic " + btoa(process.env.COUCHDB_USER + ":" + process.env.COUCHDB_PASSWORD),
		//"Content-Type" : mimeType,
		//"If-Match" : bucketDoc["_rev"],
	//}
};
const authHeader = {
	"Authorization" : "Basic " + btoa(process.env.COUCHDB_USER + ":" + process.env.COUCHDB_PASSWORD)
}

const reservedDbNames = ["buckets","user"];

async function route (request,response,user){
	let adminCallOptions = initOptions;
	let userCallOptions = initOptions;
	adminCallOptions["headers"] = Object.assign(request.headers,authHeader);

	let path = request.url;
	let pathParts = path.split("/");
	let couch = pathParts[1];
	let database = pathParts[2];
	let document = pathParts[3];
	let attachment = pathParts[4];
	
	// Step 1. Admin read the database and the document and the fields for a security object
	// Actually we want to use VIEWS to create a SECONDARY INDEX which get updated on any single document or field change
	//
	//
	let [dbSec, docSec] = await Promise.all([
			db.http.get(`/${database}/security`),
			db.http.post(`/${database}/${document}`)
		]);
	//the dbSec covers db access

	let rev = undefined;
	if (request.headers["If-match"]){ 
		rev = request.headers["If-match"];
	}

	//CRUD

	console.log("database: " + database + ", document: " + document, " + attachment: " + attachment)
	console.log(user.email)
	 // - users do not read specific fields, but the node.js does read docs?
	 // - users do read documents
	 // - users do not read databases
	//response.end();
	if (request.method === 'PUT') {

	}
	if (request.method === 'GET') {

	}
	if (request.method === 'POST') {

	}
	if (request.method === 'DELETE') {

	}



}

export default {route};