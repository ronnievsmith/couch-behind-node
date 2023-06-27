import db from './db.mjs';
import fs from "node:fs";
import jwt from './jwt.mjs';
const {generateKeyPairSync,createSign,createVerify,KeyObject,randomUUID} = await import('node:crypto');
import sgMail from '@sendgrid/mail';
import url from 'node:url';

const DAY = 86400000;
const WEEK = 604800000;
const MONTH = 2629800000;

const PRIVATE_KEY_FILENAME = '../private.pem';
const PUBLIC_KEY_FILENAME = '../public.pem';
const { privateKey, publicKey } = getKeys();

async function route(request,response,user){
	if (request.method == 'GET') {
	  let linkID = new url.URLSearchParams(request.url.split("?")[1]).get('id');
	  let queryBody = {
	    "selector": {
	      "linkID": {"$eq": linkID}
	    }         
	  }
	  await db.http.post('/users/_find', JSON.stringify(queryBody))
	  .then(async function (res) { //                                          search database for id
	    if (res.body.docs.length > 0) { 
	      let linkExpires = res.body.docs[0]["linkExpires"];
	      let expired = new Date() < Date.parse(linkExpires);
	      if (!expired) {
	        let id = res.body.docs[0]["_id"];
	        let email=res.body.docs[0]["email"];
	        let roles=res.body.docs[0]["roles"];
	        res.body.docs[0]["emailVerified"] = true; //                   switch emailVerified to true
	        delete res.body.docs[0]["linkExpires"]; //                   clear out validation link info
	        delete res.body.docs[0]["linkID"];
	        await db.http.put('/users/' + id, JSON.stringify(res.body.docs[0]))
	        let cookie = jwt.issue(privateKey,id,roles);
	        let cookieArray = [];
	        cookieArray.push(`authentication=true`);
	        cookieArray.push(`token=${cookie}; HttpOnly`);
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
	          let path = '/users/';
	          let expiration = Date.now() + DAY;
	          let body = {};
	          if(res.body.docs.length > 0){                      // user record found so obj.assign
	            body = Object.assign({}, res.body.docs[0]);
	            path = '/users/' + res.body.docs[0]["_id"];
	          } else { //========================================== user record not found
	            path = '/users/' + randomUUID();
	            body["email"]=email;
	          }
	          body["emailVerified"]=false;
	          body["linkID"]=linkID;
	          body["linkExpires"]=JSON.stringify(new Date(expiration)).replace('"','');

	          await db.http.put(path,JSON.stringify(body)).then(async function(){
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
	              response.end();
	            }
	          })
	        }).catch((e) => {
	          console.log("error is " + e);
	        })
	      }
	      if(reqBody.action === "read"){
	        let mangoBody = {
	          "selector": {
	            "_id": {"$eq": user.id}
	          }
	        }
	        await db.http.post('/users/_find',JSON.stringify(mangoBody)).then(async function (res) {
	          let obj = {};
	          if (res.body.docs.length > 0) {                      // user record found 
	            obj.email = res.body.docs[0]["email"];
	          }
	          response.end(JSON.stringify(obj));
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
    this.html = "<a href='http://localhost/auth?id=" + linkID + "'>Click here</a> to complete Your Registration";
  }
};

function getKeys() {
  if (fs.existsSync(PUBLIC_KEY_FILENAME)) { //public key file found on disk
    let privateKey = fs.readFileSync(PRIVATE_KEY_FILENAME, 'utf8');
    let publicKey = fs.readFileSync(PUBLIC_KEY_FILENAME, 'utf8');
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
    fs.writeFileSync("../public.pem", publicKey);
    fs.writeFileSync("../private.pem", privateKey);
    return {privateKey, publicKey};
  }
}

export default {route, getKeys};