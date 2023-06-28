import db from './db.mjs';
import busboy from 'busboy';
import http from "node:http";
const {randomUUID} = await import('node:crypto');
import 'dotenv/config';

async function route(request,response,user){
  if(user.id){
    if (request.method === 'POST') {
      if (request.headers["content-type"].includes("multipart/form-data")){ // =============this is a file upload
        let bucketDoc = await getBucketDoc(user.id); // ======================= Need to get revision of existing doc
        const bb = busboy({ headers: request.headers });
        bb.on('file', (name, file, info) => { //=================================================================
          const { filename, encoding, mimeType } = info;
          console.log(`File [${name}]: filename: %j, encoding: %j, mimeType: %j`, filename, encoding, mimeType);
          const options = {
            hostname: process.env.COUCHDB_HOSTNAME,
            port: 5984,
            path: '/buckets/' + bucketDoc["_id"] + "/" + encodeURIComponent(filename),
            method: 'PUT',
            headers: {
              "Authorization" : "Basic " + btoa(process.env.COUCHDB_USER + ":" + process.env.COUCHDB_PASSWORD),
              "Content-Type" : mimeType,
              "If-Match" : bucketDoc["_rev"],
            }
          };
          console.log("putting file " + JSON.stringify(options))
          const req = http.request(options, (res) => {
            console.log(`COUCH RESPONSE STATUS: ${res.statusCode}`);
            console.log(`COUCH RESPONSE HEADERS: ${JSON.stringify(res.headers, null, 2)}`);
            res.pipe(response);
          })
          file.pipe(req)
        });
        bb.on('field', (name, val, info) => {
          //console.log(`Field [${name}]: value: %j`, val);
        });
        bb.on('close', () => {
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
            if(reqBody.action === "create"){ // ==================================================================
              let docID = undefined;
            }
            if(reqBody.action === "read"){ // ====================================================================
              console.log("read POST hit")
              let queryBody = {
                "selector": {
                  "owner": {"$eq": user.id}
                }         
              }
              await db.http.post('/buckets/_find',JSON.stringify(queryBody))
              .then(async function (res) {
                if(res.body.docs.length > 0){ // =====================================================bucket found
                  console.log("bucket found");
                  if(res.body.docs[0].owner === user.id){ // ============================================= authorized
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
                console.log("Bucket Read via Mango error is " + e);
              })
            }
            if(reqBody.action === "update"){ //====================================================================
              
            }
            if(reqBody.action === "delete"){ //====================================================================
              
            }
          } catch {
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
          "_id": {"$eq": docID}
        }         
      }
      await db.http.post('/buckets/_find', JSON.stringify(queryBody))
      .then(async function (res) {
        if(res.body.docs.length > 0){                        // bucket found

          if(res.body.docs[0].owner === user.id){ // ============================= authorized
            const opts = {
              host: process.env.COUCHDB_HOSTNAME,
              port: 5984,
              path: '/buckets/' + docID + "/" + fileName,
              method: 'GET',
              headers: {
                "Authorization" : "Basic " + btoa(process.env.COUCHDB_USER + ":" + process.env.COUCHDB_PASSWORD),
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
        console.log("Mango error is " + e);
      })
    }
    if (request.method === 'DELETE') {
      let parsedURL = new URL(request.url, `http://${request.headers.host}`);
      let pathArray = parsedURL.pathname.split("/");
      let docID = pathArray[2];
      let fileName = pathArray[3];
      let rev = parsedURL.searchParams.get('rev');
      let queryBody = {
        "selector": {
          "_id": {"$eq": docID}
        }         
      }
      await db.http.post('/buckets/_find', JSON.stringify(queryBody))
      .then(async function (res) {
        if(res.body.docs.length > 0){                        // bucket found

          if(res.body.docs[0].owner === user.id){ // ============================= authorized
            const opts = {
              host: process.env.COUCHDB_HOSTNAME,
              port: 5984,
              path: '/buckets/' + docID + "/" + fileName,
              method: 'DELETE',
              headers: {
                "Authorization" : "Basic " + btoa(process.env.COUCHDB_USER + ":" + process.env.COUCHDB_PASSWORD),
                "If-Match" : rev
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
        console.log("Mango error is " + e);
      })
    }
  } else {
    response.writeHead(401, { 'Content-Type': 'text/plain' });
    response.end('unauthorized');
  }
}

async function getBucketDoc(userID){
  console.log("getBucketDoc function fired w user id: " + userID)
  let queryBody = {
    "selector": {
      "owner": {"$eq": userID}
    }         
  }
  let response = undefined;
  await db.http.post('/buckets/_find',JSON.stringify(queryBody)).then(async function (res) {
    console.log(JSON.stringify(res.body))
    if(res.body.docs.length > 0){                        // bucket found
      response =  res.body.docs[0];
    } else {                                             // bucket not found create bucket
      let newID = randomUUID();
      let body = {};
      body.owner = userID;
      body["_id"] = newID;
      console.log("calling buckets/"+newID+" with body " + JSON.stringify(body))
      await db.http.put('/buckets/' + newID, JSON.stringify(body)).then(async function(res){
        body["_rev"] = res.body.rev;
        response = body;
      }).catch((e) => {
        console.log("PUTBucketDoc error is " + e);
        return
      })
    }
  }).catch((e) => {
    console.log("getBucketDoc error is " + e);
    return
  })
  return response;
}

export default {route};