const {createSign,createVerify} = await import('node:crypto');
import { Buffer } from 'node:buffer';
const headerObject = {
  alg: 'RS256',
  typ: 'JWT',
  kid: 'public'
};
const headerString = JSON.stringify(headerObject);
const encodedHeader = Buffer.from(headerString).toString('base64url');

function issue(privateKey,sub,roles,email){
//function issue(privateKey,sub){
  let oneMonth = 2629800000;
  let exp = Date.now() + oneMonth;
  let payloadObject = {
    "exp":exp,
    "iss":"nodejs",
    "roles":roles,
    "sub":sub,
    "email":email
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
  let obj = {};
  try {
    let header = JSON.parse(Buffer.from(jwtHeader, 'base64url').toString('utf-8'));
    let alg = header.alg;
    if(alg === "RS256"){ // MUST verify alg is not set to none
      const verify = createVerify('SHA256');
      verify.write(jwtHeader + '.' + jwtPayload);
      verify.end();
      obj.valid = verify.verify(publicKey, jwtSignature, 'base64url');
      obj.payload = {};
      try {
        jwtPayload = JSON.parse(Buffer.from(jwtPayload, 'base64url').toString('utf-8'));
        obj.payload = Object.assign(obj.payload,jwtPayload);
      } finally {
        return obj;
      }
    }
  } finally {
    obj.valid = false;
    return obj;
  }
}

export default {issue,verify};
