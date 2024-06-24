const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const axios = require('axios');

const poolData = {
  UserPoolId: 'us-east-1_YuHrxeoCB', 
  ClientId: 'ntab9dm5cv2enr6c1gfqpm8ov',   
};
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

const authenticateUser = (username, password) => {
  return new Promise((resolve, reject) => {
    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
      Username: username,
      Password: password,
    });

    const userData = {
      Username: username,
      Pool: userPool,
    };

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        const idToken = result.getIdToken().getJwtToken();
        resolve(idToken);
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
};

const verifyToken = (token) => {
  return new Promise(async (resolve, reject) => {
    const userPoolId = poolData.UserPoolId;
    const region = 'us-east-1'; 
    const cognitoIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

    try {
      const response = await axios.get(`${cognitoIssuer}/.well-known/jwks.json`);
      const keys = response.data.keys;
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded) {
        return reject(new Error('Not a valid JWT token'));
      }

      const kid = decoded.header.kid;
      const key = keys.find(k => k.kid === kid);
      if (!key) {
        return reject(new Error('Public key not found in jwks.json'));
      }

      const pem = jwkToPem(key);
      jwt.verify(token, pem, { issuer: cognitoIssuer }, (err, payload) => {
        if (err) {
          return reject(err);
        }
        resolve(payload);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { authenticateUser, verifyToken };
