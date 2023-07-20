import db from './db.mjs';
import fs from "node:fs";
import jwt from './jwt.mjs';
const {generateKeyPairSync,randomUUID} = await import('node:crypto');
import sgMail from '@sendgrid/mail';
import url from 'node:url';
import path from "node:path";
import * as readline from 'node:readline/promises';
const DIR_NAME = path.dirname(url.fileURLToPath(import.meta.url));
const APP_PATH = path.join(DIR_NAME, '..');
const KEYS_PATH = path.join(APP_PATH, 'keys');
const ROOT_PATH = path.join(DIR_NAME, '...');
const COUCHDB_PATH = path.join(ROOT_PATH, 'couchdb');
const PRIVATE_KEY_PATH = path.join(KEYS_PATH, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_PATH, 'public.pem');
const DAY = 86400000;
const WEEK = 604800000;
const MONTH = 2629800000;
const { privateKey, publicKey } = getKeys();

async function sendKeyToCouch(publicKey){
	//open the local.ini file and set it there
}

async function route(request,response,user){
	if (request.method == 'GET') {
	  let linkID = new url.URLSearchParams(request.url.split("?")[1]).get('id');
	  //console.log("auth route fired w linkID " + linkID)
	  let queryBody = {
	    "selector": {
	      "linkID": {"$eq": linkID}
	    }         
	  }
	  await db.http.post('/users/_find', JSON.stringify(queryBody))
	  .then(async function (res) { //                                            search database for id
	    if (res.body.docs.length > 0) { 
	      let linkExpires = res.body.docs[0]["linkExpires"];
	      let expired = new Date() < Date.parse(linkExpires);
	      if (!expired) {
	      	let roles=["member"];
	        let sub = res.body.docs[0]["_id"];
	        let email=res.body.docs[0]["email"];
	        //console.log("found res.body.docs[0][roles] is " + res.body.docs[0]["roles"] )
	        if(res.body.docs[0]["roles"]){
	        	if(!res.body.docs[0]["roles"].includes("member")){
	        		res.body.docs[0]["roles"] = res.body.docs[0]["roles"].concat(roles);
	        	}
	        	if(res.body.docs[0]["roles"].includes("_admin")){
	        		const index = res.body.docs[0]["roles"].indexOf("_admin");
							if (index > -1) { // only splice array when item is found
							  res.body.docs[0]["roles"].splice(index, 1); // 2nd parameter means remove one item only
							}
	        	}
	        } else {
	        	res.body.docs[0]["roles"] = roles;
	        }
	        
	        res.body.docs[0]["emailVerified"] = true; //                   switch emailVerified to true
	        delete res.body.docs[0]["linkExpires"]; //                   clear out validation link info
	        delete res.body.docs[0]["linkID"];

			    //is this user a server admin? if so add _admins to roles
		    	let isAdminRes = await db.http.get('/_node/_local/_config/admins/' + sub)
		    	if(!isAdminRes.error){
		    		if(isAdminRes.body)
		    		res.body.docs[0]["roles"].push("_admin");
		    	}

	        await db.http.put('/users/' + sub, JSON.stringify(res.body.docs[0])) // mark as emailValidated

	        let cookie = jwt.issue(privateKey,sub,res.body.docs[0]["roles"],email);
	        //let cookie = jwt.issue(privateKey,sub);
	        let cookieArray = [];
	        cookieArray.push(`authentication=true`);
	        cookieArray.push(`token=${cookie}`);
	        response.setHeader('Set-Cookie', cookieArray);

	        response.writeHead(301, { Location: '/' });
	        response.end();
	      } else { //================================================================================= link expired
	        response.writeHead(410, { 'Content-Type': 'text/plain' });
	        response.end('gone');
	      }
	    } else { //================================================================================== link id not found
	      response.writeHead(404, { 'Content-Type': 'text/plain' });
	      response.end('not found');
	    }
	  })
	  .catch((e) => {
	    console.log("Error processing email link " + e);
	    response.writeHead(500, { 'Content-Type': 'text/plain' });
	    response.end('Internal Server Error');
	  })
	}
	// ==================================================================================================================
	if (request.method == 'POST') {
	  let reqBody = '';
	  request.on('data', chunk => {
	    reqBody += chunk.toString(); // convert Buffer to string
	  });
	  request.on('end', async () => {
	    try {
	      reqBody = JSON.parse(reqBody);
	      if(reqBody.action === "create"){
	        let email = reqBody.email;
	        let mangoBody = {
	          "selector": {
	            "email": {"$eq": email}
	          }
	        }
	        await db.http.post('/users/_find', JSON.stringify(mangoBody)).then(async function (res) {
	          let linkID = randomUUID();
	          //let userID = undefined;
	          let path = '/users/';
	          let expiration = Date.now() + DAY;
	          let body = {};
	          if(res.body.docs.length > 0){                      // user record found so obj.assign
	            body = Object.assign({}, res.body.docs[0]);
	            path = '/users/' + res.body.docs[0]["_id"];
	            //userID = res.body.docs[0]["_id"];
	          } else { //========================================== user record not found
	            //userID = randomUUID();
	            path = '/users/' + randomUUID();
	            body["email"]=email;
	          }
	          body["emailVerified"]=false;
	          body["linkID"]=linkID;
	          body["linkExpires"]=JSON.stringify(new Date(expiration)).replace('"','');

	          let createUserRes = await db.http.put(path,JSON.stringify(body));
	          if(createUserRes.body.id){
	            try {
	              if(email){
	                let msg = new Msg(linkID,email);
	                sgMail.send(msg).then(async () => { // email sent
	                })
	                .catch((error) => {
	                  console.error("Email failed to send with error: " + error)
	                })                    
	              }
	            } finally {
	            	response.writeHead(200, {'Content-Type': 'application/json'});
	              response.end(`{"ok":true,"id":"${createUserRes.body.id}"}`);
	            }
	          } else {
	          	throw new Error("Error adding user")
	          }
	        }).catch((e) => {
	          console.log("error is " + e);
						response.writeHead(500, {'Content-Type': 'application/json'});
	    			response.end(`"Internal Server Error":  ${e}`);
	        })
	      }
	      if(reqBody.action === "read"){
	        let mangoBody = {
	          "selector": {
	            "_id": {"$eq": user.sub}
	          }
	        }
	        await db.http.post('/users/_find',JSON.stringify(mangoBody)).then(async function (res) {
	          //let obj = {};
	          //if (res.body.docs.length > 0) {                      // user record found 
	            //obj.email = res.body.docs[0]["email"];
	            //obj = Object.assign(obj,res.body.docs[0]);
		          response.writeHead(200, { 'Content-Type': 'application/json' });
		          response.end(JSON.stringify(res.body));
	          // } else {
	          // 	response.writeHead(404, { 'Content-Type': 'application/json' });
		        //   response.end();
	          // }
	        });
	      }
	      if(reqBody.action === "update"){
	      }
	      if(reqBody.action === "delete"){ //deletes the JWT stored client side
	        if(request.headers.cookie){
	          let cookieArray = [];
	          cookieArray.push(`authentication=false; max-age=0`);
	          cookieArray.push(`token=null; HttpOnly; max-age=0`);
	          response.setHeader('Set-Cookie', cookieArray);
	          response.end(); 
	        }            
	      }
	    } catch {
	      response.end();
	    }
	  });
	}
}

class Msg {
  constructor(linkID,email) {
    this.to = email;
    this.from = "ronnie@ronnieroyston.com";
    this.subject = "Complete Your Registration";
    this.html = "<a href='http://localhost/authentication?id=" + linkID + "'>Click here</a> to complete Your Registration";
  }
};

function getKeys() {
  if (fs.existsSync(PUBLIC_KEY_PATH)) { //public key file found on disk
    let privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    let publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
    return {privateKey, publicKey};
  } else {
    let { privateKey, publicKey } = generateKeyPairSync("rsa", { //public key file NOT found
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      }
    });
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
    return {privateKey, publicKey};
  }
}

async function sendPublicKey() {
	//sends the public key to CouchDB
  if (fs.existsSync(PUBLIC_KEY_PATH)) { //public key file found on disk
    //let publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
  	let str = "";
	  const fileStream = fs.createReadStream(PUBLIC_KEY_PATH);

	  const rl = readline.createInterface({
	    input: fileStream,
	    crlfDelay: Infinity
	  });
	  // Note: we use the crlfDelay option to recognize all instances of CR LF
	  // ('\r\n') in input.txt as a single line break.

	  for await (const line of rl) {
	    // Each line in input.txt will be successively available here as `line`.
	    //console.log(`Line from file: ${line}`);
	    str = str += `${line}\\n`
	  }
	  //PUT "http://a:a@127.0.0.1:15984/_node/_local/_config/jwt_keys/hmac:testkey" -d '"-----BEGIN PUBLIC KEY-----\\nMIIBIjAN....DAQAB\\n-----END PUBLIC KEY-----\\n"
		let body = str;
	  await db.http.put('/_node/_local/_config/jwt_keys/rsa:public',JSON.stringify(body)).then(async function (res) {
	  	console.log(JSON.stringify(res));
    });
  }
}

export default {route, getKeys, sendPublicKey};