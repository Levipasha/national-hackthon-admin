const https = require('https');

const data = JSON.stringify({
  name: 'codesprint_preset',
  unsigned: true,
  folder: 'codesprint'
});

const options = {
  hostname: 'api.cloudinary.com',
  port: 443,
  path: '/v1_1/x118v8hq/upload_presets',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + Buffer.from('545767342296275:0D48AC71BAcmdWPj6IV5nA4DIE4').toString('base64'),
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let d = '';
  res.on('data', (chunk) => { d += chunk; });
  res.on('end', () => { console.log(d); });
});

req.on('error', (e) => { console.error(e); });
req.write(data);
req.end();
