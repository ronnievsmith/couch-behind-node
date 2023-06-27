import {request as httpSync} from 'node:http';
import {request as httpsSync} from 'node:https';

function http(options,body){
  return new Promise(function (resolve, reject) {
    const req = httpSync(options, (res) => {
      var data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk });
      res.on('end', () => {
        try {
          data = JSON.parse(data);
        } finally {
          resolve({"body":data,"statusCode":res.statusCode,"headers":res.headers})
        }
      });
    });
    req.on('error', (e) => {
      reject(e);
      console.error(`problem with request: ${e.message}`);
    });
    if(!isEmpty(body))(req.write(body));
    req.end();
  });
}

function https(options,body){
  return new Promise(function (resolve, reject) {
    const req = httpsSync(options, (res) => {
      var data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk });
      res.on('end', () => {
        try {
          data = JSON.parse(data);
        } finally {
          resolve({"body":data,"statusCode":res.statusCode,"headers":res.headers})
        }
      });
    });
    req.on('error', (e) => {
      reject(e);
    });
    if(!isEmpty(body))(req.write(body));
    req.end();
  });
}

function isEmpty(obj) {
  for (var i in obj) return false;
  return true;
}

export default {http,https};