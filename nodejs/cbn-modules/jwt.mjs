//const {generateKeyPairSync,createSign,createVerify,KeyObject,randomUUID} = await import('node:crypto');
const {createSign,createVerify} = await import('node:crypto');
// const signatureFunction = createSign('RSA-SHA256');
// const verifyFunction = createVerify('RSA-SHA256');
import { Buffer } from 'node:buffer';
const headerObject = {
  alg: 'HS256',
  typ: 'JWT',
};
const headerString = JSON.stringify(headerObject);
const encodedHeader = Buffer.from(headerString).toString('base64url');

function issue(privateKey,id,roles){
  let oneMonth = 2629800000;
  let exp = Date.now() + oneMonth;
  let payloadObject = {
    "iss": 'my_server_name',//information about the server that issued the token
    "exp": exp,
    "roles": roles,
    "id": id //put other stuff in here too to suit your needs
  };
  let payloadString = JSON.stringify(payloadObject);
  let encodedPayload = Buffer.from(payloadString).toString('base64url');
  const sign = createSign('SHA256');
  sign.write(encodedHeader + '.' + encodedPayload);
  sign.end();
  let signature = sign.sign(privateKey, 'base64url');
  let jsonWebToken = encodedHeader + '.' + encodedPayload + '.' + signature;
  return jsonWebToken;
}

function verify(publicKey,jwt){
  let jwtParts = jwt.split('.');
  let jwtHeader = jwtParts[0];
  let jwtPayload = jwtParts[1];
  let jwtSignature = jwtParts[2];
  const verify = createVerify('SHA256');
  verify.write(jwtHeader + '.' + jwtPayload);
  verify.end();
  let obj = {};
  obj.valid = verify.verify(publicKey, jwtSignature, 'base64url');
  obj.payload = {};
  try {
    jwtPayload = JSON.parse(Buffer.from(jwtPayload, 'base64url').toString('utf-8'));
    obj.payload.id = jwtPayload.id;
    obj.payload.roles = jwtPayload.roles;
  } finally {
    return obj;
  }
}

export default {issue,verify};
