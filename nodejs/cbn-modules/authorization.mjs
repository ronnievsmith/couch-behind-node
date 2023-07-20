import db from './db.mjs';
import jwt from './jwt.mjs';
import authentication from './authentication.mjs';
import 'dotenv/config';
const { privateKey, publicKey } = authentication.getKeys();
async function user (request){
	//read the endpoint
		//is there a security object present on the database? we know db by depth of arg in path

		//is there a security object present on the document? 

		//is there a security object on the field?

	// let path = request.url;
	// let pathParts = path.split("/");
	// let couch = pathParts[1];
	// let database = pathParts[2];
	// let document = pathParts[3];
	// let attachment = pathParts[4];
	 // - users do not read specific fields, but the node.js does read docs?
	 // - users do read documents
	 // - users do not read databases


  let user = {};
  if(request.headers.cookie){
  	try {
	    let cookies = parseCookies(request.headers.cookie);
	    if(cookies.token){
	      let token = cookies.token;
	      let jot = jwt.verify(publicKey,token);
	      user = Object.assign(user,jot.payload)   
	    }  		
  	} catch (e) {
  		var ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress || null;
  		console.log("Error reading authentication from " + ip + e);
  	} finally {
  		return user;
  	}
  }
  return user;
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

export default {user};