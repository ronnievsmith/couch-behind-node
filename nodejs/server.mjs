/*
  Ronnie Royston (https://ronnieroyston.com)
*/

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import url from 'node:url';
import 'dotenv/config';
const DIRECTORIES = [];
const DIR_NAME = path.dirname(url.fileURLToPath(import.meta.url));
import { Doc } from './cbn-modules/doc.mjs';
import MIME_TYPES from './cbn-modules/mime-types.mjs';
import db from './cbn-modules/db.mjs';
import jwt from './cbn-modules/jwt.mjs';
import auth from './cbn-modules/auth.mjs';
import buckets from './cbn-modules/buckets.mjs';
import sgMail from '@sendgrid/mail';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "SG.my.key";
const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
};
const PORT = process.env.NODEJS_PORT || 8080;
const ROOT_DIRECTORY = './public';
const PRIVATE_KEY_FILENAME = './private.pem';
const PUBLIC_KEY_FILENAME = './public.pem';
const ROOT_PATH = path.join(DIR_NAME, ROOT_DIRECTORY);
const ROOT_PATH_DIRECTORIES = getDirectoriesRecursive(ROOT_PATH);
const ROOT_PATH_DEPTH = ROOT_PATH.split(path.sep).length;
const { privateKey, publicKey } = auth.getKeys();  //before we start server we need RSA keys

const SERVER = http.createServer(async function(request, response) {
  let statusCode = 200;
  let user = {};
  user.id = null;
  user.roles = [];
  if(request.headers.cookie){
    let cookies = parseCookies(request.headers.cookie);
    if(cookies.token){
      let token = cookies.token;
      let jot = jwt.verify(publicKey,token);
      user.id = jot.payload.id;
      user.roles = jot.payload.roles;      
    }
  }
  if(request.url === '/app') {
    let doc = await new Doc({'main':'app', 'aside':'app', 'bodyClass':'wide-nav'}).build(); // return app page
    response.end(doc);
  } else if (request.url.startsWith('/buckets')){
    buckets.route(request,response,user)
  } else if (request.url.startsWith('/auth')){
    auth.route(request,response,user)
  } else if (request.url === '/fetch'){
    let doc = await new Doc({'main':'fetch', 'aside':'fetch', 'nav':'couch', 'bodyClass':'wide-nav'}).build();
    response.end(doc);
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
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end("Resource Not Found");
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
        throw new Error('Sendgrid API key required to start server.');
      }
      sgMail.setApiKey(SENDGRID_API_KEY);
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