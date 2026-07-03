const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/user-lookup?service=phone&query=9999999999',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Response status:', res.statusCode, 'Data:', data));
});

req.on('error', (err) => console.error(err));
req.end();
