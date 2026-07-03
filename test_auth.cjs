const http = require('http');

http.get('http://localhost:3000/api/user-lookup?service=phone&query=9999999999', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Response:', data));
}).on('error', (err) => console.error(err));
