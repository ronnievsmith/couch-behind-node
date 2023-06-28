import req from './req.mjs';
import 'dotenv/config';
// const COUCHDB_HOSTNAME = process.env.COUCHDB_HOSTNAME;
// const COUCHDB_USER = process.env.COUCHDB_USER;
// const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD;
class Options {
  constructor() {
    this.host = process.env.COUCHDB_HOSTNAME;
    this.headers = {
      "Authorization" : "Basic " + btoa(process.env.COUCHDB_USER + ":" + process.env.COUCHDB_PASSWORD),
      "Content-Type" : "application/json"
    };
    this.port = 5984;
  }
};
//If both url and options are specified, the objects are merged, with the options properties taking precedence.
const http = {
  // this works too!
  async get(arg,body) {
    let options = new Options();
    if(typeof arg ==="object"){
      Object.assign(options,arg);
    } else {
      options.path = arg;
    }
    options.method = 'GET';
    return await req.http(options,body);
  },
  async put(arg,body) {
    let options = new Options();
    if(typeof arg ==="object"){
      Object.assign(options,arg);
    } else {
      options.path = arg;
    }
    options.method = 'PUT';
    return await req.http(options,body);
  },
  async post(arg,body) {
    let options = new Options();
    if(typeof arg ==="object"){
      Object.assign(options,arg);
    } else {
      options.path = arg;
    }
    options.method = 'POST';
    return await req.http(options,body);
  },
  async delete(arg,body) {
    let options = new Options();
    if(typeof arg ==="object"){
      Object.assign(options,arg);
    } else {
      options.path = arg;
    }
    options.method = 'DELETE';
    return await req.http(options,body);
  },
  async head(arg,body) {
    let options = new Options();
    if(typeof arg ==="object"){
      Object.assign(options,arg);
    } else {
      options.path = arg;
    }
    options.method = 'HEAD';
    return await req.http(options,body);
  }
}

export default {http};