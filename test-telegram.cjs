const http = require('http');

http.get('http://127.0.0.1:3000/api/lookup?key=YOUR_SECURE_RANDOM_INTERNAL_MASTER_KEY&query=Seekhlebhai', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Lookup API Response:', data));
});
