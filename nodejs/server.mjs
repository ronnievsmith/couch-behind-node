/*
  Ronnie Royston (https://ronnieroyston.com)
  Create an .env file and save it in the nodejs folder
  COUCHDB_USER="admin"
  COUCHDB_PASSWORD="admin"
  COUCHBD_PORT="5984"
  NODEJS_PORT="8080"
  SENDGRID_API_KEY=SG.XXXX.YYYYY
*/

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import url from 'node:url';
import 'dotenv/config';
const DIRECTORIES = [];
const DIR_NAME = path.dirname(url.fileURLToPath(import.meta.url));
import busboy from 'busboy';
import { Doc } from './cbn-modules/doc.mjs';
import req from './cbn-modules/req.mjs';
import db from './cbn-modules/db.mjs';
import jwt from './cbn-modules/jwt.mjs';
import sgMail from '@sendgrid/mail';
const {generateKeyPairSync,createSign,createVerify,KeyObject,randomUUID} = await import('node:crypto');
const COUCHDB_HOSTNAME = "couchdb";
const COUCHDB_USERNAME = process.env.COUCHDB_USER;
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
};
const MIME_TYPES = {
  default: 'application/octet-stream',
  aac: 'audio/aac',
  bin: 'application/octet-stream',
  bmp: 'image/bmp',
  css: 'text/css',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  eot: 'application/vnd.ms-fontobject',
  epub: 'application/epub+zip',
  gz: 'application/gzip',
  gif: 'image/gif',
  htm: 'text/html; charset=UTF-8',
  html: 'text/html; charset=UTF-8',
  ico: 'image/x-icon',
  ics: 'text/calendar',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  js: 'text/javascript',
  json: 'application/json',
  jsonld: 'application/ld+json',
  mjs: 'text/javascript',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  mpeg: 'video/mpeg',
  png: 'image/png',
  pdf: 'application/pdf',
  php: 'application/x-httpd-php',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  svg: 'image/svg+xml',
  tar: 'application/x-tar',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  txt: 'text/plain',
  vsd: 'application/vnd.visio',
  wav: 'audio/wav',
  webm: 'video/webm',
  woff: 'font/woff',
  woff2: 'font/woff2',
  xhtml: 'application/xhtml+xml',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xml: 'application/xml',
  zip: 'application/zip'
};
const PORT = process.env.NODEJS_PORT || 8080;
const ROOT_DIRECTORY = './public';
const PRIVATE_KEY_FILENAME = './private.pem';
const PUBLIC_KEY_FILENAME = './public.pem';
const ROOT_PATH = path.join(DIR_NAME, ROOT_DIRECTORY);
const ROOT_PATH_DIRECTORIES = getDirectoriesRecursive(ROOT_PATH);
const ROOT_PATH_DEPTH = ROOT_PATH.split(path.sep).length;
const DAY = 86400000;
const WEEK = 604800000;
const MONTH = 2629800000;
//const USERS_DB_EXISTS = false;
const { privateKey, publicKey } = getKeys();  //before we start server we need RSA keys

async function getBucketDoc(user){
  let queryBody = {
    "selector": {
      "owner": {"$eq": user}
    }         
  }
  let response = undefined;
  await db.http.post('/buckets/_find',JSON.stringify(queryBody)).then(async function (res) {

    if(res.body.docs.length > 0){                        // bucket found
      response =  res.body.docs[0];
    } else {                                             // bucket not found create bucket
      console.log("getBucket ELSE fired")
      let newID = randomUUID();
      let body = {};
      body.owner = user;
      body["_id"] = newID;
      await db.http.put('/buckets/' + newID, JSON.stringify(body)).then(async function(res){
        //Object.assign(body,res.body);
        body["_rev"] = res.body.rev;
        response = body;
      });
    }
  }).catch((e) => {
    console.log("getBucketDoc error is " + e);
    return
  })
  return response;
}

const SERVER = http.createServer(async function(request, response) {
  let statusCode = 200;
  let user = undefined;
  let roles = undefined;
  if(request.headers.cookie){
    let cookies = parseCookies(request.headers.cookie);
    if(cookies.token){
      let token = cookies.token;
      let jot = jwt.verify(publicKey,token);
      user = jot.payload.id;
      roles = jot.payload.roles;      
    }
  }

  if(request.url === '/app') {
    let doc = await new Doc({'main':'app', 'aside':'app', 'bodyClass':'wide-nav'}).build();
    // the client will try and fetch the users bucket info
    response.end(doc);
  // ==============================================================================================================
  } else if (request.url.startsWith('/buckets')){
  // ==============================================================================================================
    console.log("/buckets path hit w user " + user)
    if(user){
      if (request.method === 'POST') {
        if (request.headers["content-type"].includes("multipart/form-data")){ // =============this is a file upload
          let bucketDoc = await getBucketDoc(user); // ======================= Need to get revision of existing doc
          const bb = busboy({ headers: request.headers });
          bb.on('file', (name, file, info) => { //=================================================================
            const { filename, encoding, mimeType } = info;
            //console.log(`File [${name}]: filename: %j, encoding: %j, mimeType: %j`, filename, encoding, mimeType);
            const options = {
              hostname: COUCHDB_HOSTNAME,
              port: 5984,
              path: '/buckets/' + bucketDoc["_id"] + "/" + encodeURIComponent(filename),
              method: 'PUT',
              headers: {
                "Authorization" : "Basic " + btoa(COUCHDB_USERNAME + ":" + COUCHDB_PASSWORD),
                "Content-Type" : mimeType,
                "If-Match" : bucketDoc["_rev"],
              }
            };
            const req = http.request(options, (res) => {
              // console.log(`COUCH RESPONSE STATUS: ${res.statusCode}`);
              // console.log(`COUCH RESPONSE HEADERS: ${JSON.stringify(res.headers, null, 2)}`);
              res.setEncoding('utf8');
              res.on('data', (chunk) => {
              });
              res.on('end', () => {
                console.log('No more data in response from couch.');
              });
            });
            req.on('error', (e) => {
              console.error(`problem with couch request: ${e.message}`);
            });
            file.pipe(req)
          });
          bb.on('field', (name, val, info) => {
            console.log(`Field [${name}]: value: %j`, val);
          });
          bb.on('close', () => {
            console.log('Done parsing form!');
            response.writeHead(303, { Connection: 'close', Location: '/' });
            response.end();
          });
          request.pipe(bb);
        } else { // =========================================== NOT a file upload parse this POST request like usual
          let reqBody = [];
          request.on('data', chunk => {
            reqBody.push(chunk)
          });
          request.on('end', async () => {
            reqBody = Buffer.concat(reqBody).toString();
            try {
              reqBody = JSON.parse(reqBody);
              if(reqBody.action === "create"){ //==================================================================
                let docID = undefined;
              }
              if(reqBody.action === "read"){ //====================================================================
                console.log("read POST hit")
                let queryBody = {
                  "selector": {
                    "owner": {"$eq": user}
                  }         
                }
                await db.http.post('/buckets/_find',JSON.stringify(queryBody))
                .then(async function (res) {
                  if(res.body.docs.length > 0){ // ====================================================bucket found
                    console.log("bucket found");
                    if(res.body.docs[0].owner === user){ // ============================================ authorized
                      response.writeHead(200, { 'Content-Type': 'text/plain' });
                      response.end(JSON.stringify(res.body.docs[0]));
                    } else { // ===================================================================== not authorized
                      response.writeHead(401, { 'Content-Type': 'text/plain' });
                      response.end('unauthorized');
                    }
                  } else { // ===================================================================== bucket not found
                    response.writeHead(404, { 'Content-Type': 'text/plain' });
                    response.end('not found');
                  }
                })
                .catch((e) => {
                  console.log("error is " + e);
                })
              }
              if(reqBody.action === "update"){ //====================================================================
                
              }
              if(reqBody.action === "delete"){ //====================================================================
                
              }
            } catch {
              console.log("catch line 238 hit")
              response.end();
            }
          });
        }
      }
      if (request.method === 'GET') {
        let pathArray = new URL(request.url, `http://${request.headers.host}`).pathname.split("/");
        let docID = pathArray[2];
        let fileName = pathArray[3];
        let queryBody = {
          "selector": {
            "owner": {"$eq": user}
          }         
        }
        await db.http.post('/buckets/_find', JSON.stringify(queryBody))
        .then(async function (res) {
          if(res.body.docs.length > 0){                        // bucket found

            if(res.body.docs[0].owner === user){ // ============================= authorized
              const opts = {
                host: COUCHDB_HOSTNAME,
                port: 5984,
                path: '/buckets/' + docID + "/" + fileName,
                method: 'GET',
                headers: {
                  "Authorization" : "Basic " + btoa(COUCHDB_USERNAME + ":" + COUCHDB_PASSWORD),
                },
              };
              const creq = http.request(opts, (cres) => {
                cres.pipe(response);
              });
              request.pipe(creq);
            } else { // ========================================================= not authorized
              res.writeHead(401, { 'Content-Type': 'text/plain' });
              res.end('unauthorized');
            }
          } else {                                             // bucket not found
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('not found');
          }
        })
        .catch((e) => {
          console.log("error is " + e);
        })
      }
    } else {
      response.writeHead(401, { 'Content-Type': 'text/plain' });
      response.end('unauthorized');
    }
  // ==============================================================================================================
  } else if (request.url.startsWith('/auth')){
  // ==============================================================================================================
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
      //response.end();  
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
                      //error sending email
                      console.error(error)
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
                "_id": {"$eq": user}
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
  // =============================================================================================================
  } else if (request.url === '/fetch'){
    let doc = await new Doc({'main':'fetch', 'aside':'fetch', 'nav':'couch', 'bodyClass':'wide-nav'}).build();
    response.end(doc);
  // =============================================================================================================
  } else if (request.url === '/admin'){ // proxy thru to Couch after checking authorization
    if(roles){
      console.log('cbn route hit and user isAdmin:' + roles.includes("admin"));
    }
    
    //only allow read, write, update, delete on specific documents if role is user
    //allow read, write, update, delete on anything if role is admin
    //roles are enforced server side, not in the JWT
    //admins database contains a document for each user who is an admin? or add to roles user users DB?
    response.end("ok");
  // =============================================================================================================
  } else {
    let file = await fileNameBuilder(request.url);
    let mimeType = MIME_TYPES[file.ext] || MIME_TYPES.default;
    file.stream.pipe(response);
    file.stream.on('open',function() {
      response.writeHead(statusCode, Object.assign({}, HEADERS, {'Content-Type': mimeType}));
    });
    file.stream.on('end',function() {
      response.end();
    });
    file.stream.on('error',function(err) {
      statusCode = 404;
      response.statusCode = statusCode;
      response.write("Resource Not Found");
      response.end();
    });
  }
  // ==============================================================================================================
  response.on('finish', () => {
    if(statusCode === 404){
      console.log(`${request.headers.host} ${request.method} ${request.url}`,`\x1b[31m${statusCode}\x1b[0m`);
    } else {
      console.log(`${request.headers.host} ${request.method} ${request.url} \x1b[32m${statusCode}\x1b[0m`);
    }
  });
});

(async function () {
    try {
      
      ROOT_PATH_DIRECTORIES.forEach(function(directory){ //  identify all hosted directories add append index.html
        let posixPath = directory.split(path.sep).join(path.posix.sep);
        let fullPathArray = posixPath.split(path.posix.sep);
        let relativePathArray = fullPathArray.slice(ROOT_PATH_DEPTH);
        DIRECTORIES.push(path.posix.join(path.posix.sep,...relativePathArray))
      });
      
      let doc = await new Doc().build(); //                                     build index page
      fs.writeFileSync('./public/index.html', doc);

      let _usersDbExists = await loadDatabase("_users"); //                     DOES THE _USERS DATABASE EXIST?
      let _replicatorDbExists = await loadDatabase("_replicator"); //           DOES THE _REPLICATOR DATABASE EXIST?
      let usersDbExists = await loadDatabase("users");       //                 DOES THE USERS DATABASE EXIST?
      let bucketsDbExists = await loadDatabase("buckets");   //                 DOES THE BUCKETS DATABASE EXIST?

      if(SENDGRID_API_KEY === 'SG.my.key'){
        throw new Error('Sendgrid API Key must be added to .env file');
      }
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      if(usersDbExists && bucketsDbExists){
        await SERVER.listen(PORT);
        console.log('\x1b[32m%s\x1b[0m',`Server running at http://127.0.0.1:${PORT}/`);
      } else {
        console.log('\x1b[31m%s\x1b[0m','Error connecting to users database.');
      }      
    } catch(e) {
      console.log('\x1b[31m%s\x1b[0m',`Server failed to start. ${e}`);
    }
})();

class Msg {
  constructor(linkID,email) {
    this.to = email;
    this.from = "ronnie@ronnieroyston.com";
    this.subject = "Complete Your Registration";
    this.html = "<a href='http://localhost/auth?id=" + linkID + "'>Click here</a> to complete Your Registration";
  }
};

async function fileNameBuilder (url) {
  const PATH_PARTS_ARRAY = [ROOT_PATH, url];
  DIRECTORIES.forEach(function(directory){ //add index.html to URLs pointing to directories
    if(url === directory){
      PATH_PARTS_ARRAY.push('index');
    }
  })
  let filePath = path.join(...PATH_PARTS_ARRAY);
  if(!path.extname(filePath)){ //add .html to URLs with no file extension
    filePath = filePath + '.html';
  }
  let ext = path.extname(filePath).substring(1).toLowerCase();
  let stream = fs.createReadStream(filePath);
  return { ext, stream };
}

function flatten(lists) {
  return lists.reduce((a, b) => a.concat(b), []);
}

function parseCookies(cookie){
  if (cookie){
    cookie = cookie.split("; ");
    let obj = {};
    cookie.forEach((item,index) => {
      let i = item.split("=");
      obj[i[0]]=i[1];
    });
    return obj;   
  }
  return cookie;
}

function getDirectories(srcpath) {
  return fs.readdirSync(srcpath)
    .map(file => path.join(srcpath, file))
    .filter(path => fs.statSync(path).isDirectory());
}

function getDirectoriesRecursive(srcpath) {
  return [srcpath, ...flatten(getDirectories(srcpath).map(getDirectoriesRecursive))];
}

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
    fs.writeFileSync("public.pem", publicKey);
    fs.writeFileSync("private.pem", privateKey);
    return {privateKey, publicKey};
  }
}

async function loadDatabase(name){
  try {
    let res = await db.http.get('/' + name);
    if(res.body.error === "not_found"){ //so try and create it
      try {
        let res = await db.http.put('/' + name);
        console.log('\x1b[32m%s\x1b[0m',`Created ${name} Database`);
        return true;
      } catch(e) {
        console.log('\x1b[31m%s\x1b[0m',`Error Creating ${name} Database: ${e}`);
        return false;
      }
    } else {
      return true;
    }
  } catch(e) {
    console.log('\x1b[31m%s\x1b[0m',`Error Creating ${name} Database: ${e}`);
    return false;
  }
}