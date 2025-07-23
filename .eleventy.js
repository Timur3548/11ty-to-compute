
// PA-API Proxy Server for Amazon.co.uk (Node.js - Express)
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();
app.use(express.json());

// Amazon PA-API kimlik bilgilerin
const accessKey = "AKPARDAVAW1753296566";
const secretKey = "oVY7pKxfN/igQjMr5Kf3XXFg3DVXKkYk/Tkrt3tV";
const associateTag = "timur07-21"; // Amazon UK associates tag

// BÃ¶lge ve servis ayarlarÄ± UK iÃ§in
const region = "eu-west-1";
const service = "ProductAdvertisingAPI";
const host = "webservices.amazon.co.uk";
const endpoint = "https://webservices.amazon.co.uk/paapi5/searchitems";

// AWS4 Signature v4 fonksiyonlarÄ±
function sign(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}
function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = sign('AWS4' + key, dateStamp);
  const kRegion = sign(kDate, regionName);
  const kService = sign(kRegion, serviceName);
  const kSigning = sign(kService, 'aws4_request');
  return kSigning;
}

// Proxy endpoint: /search
app.post('/search', async (req, res) => {
  const keywords = req.body.keywords || "headphones";
  const payload = JSON.stringify({
    "Keywords": keywords,
    "SearchIndex": "All",
    "PartnerTag": associateTag,
    "PartnerType": "Associates",
    "Marketplace": "www.amazon.co.uk"
  });

  // Zaman damgasÄ± oluÅŸturma
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  const canonicalUri = '/paapi5/searchitems';
  const canonicalQuerystring = '';
  const canonicalHeaders = 
    'content-encoding:amz-1.0\n' +
    'content-type:application/json; charset=utf-8\n' +
    'host:' + host + '\n' +
    'x-amz-date:' + amzDate + '\n';
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date';

  const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex');
  const canonicalRequest = 
    'POST\n' + canonicalUri + '\n' + canonicalQuerystring + '\n' +
    canonicalHeaders + '\n' + signedHeaders + '\n' + hashedPayload;

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = dateStamp + '/' + region + '/' + service + '/aws4_request';
  const stringToSign =
    algorithm + '\n' +
    amzDate + '\n' +
    credentialScope + '\n' +
    crypto.createHash('sha256').update(canonicalRequest).digest('hex');

  // Ä°mzalama
  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorizationHeader = 
    algorithm + ' ' +
    'Credential=' + accessKey + '/' + credentialScope + ', ' +
    'SignedHeaders=' + signedHeaders + ', ' +
    'Signature=' + signature;

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        'Content-Encoding': 'amz-1.0',
        'Content-Type': 'application/json; charset=utf-8',
        'Host': host,
        'X-Amz-Date': amzDate,
        'Authorization': authorizationHeader
      }
    });
    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send(err.response?.data || err.message);
  }
});

// Sunucu portu
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('UK PA-API proxy running on port ' + PORT));
