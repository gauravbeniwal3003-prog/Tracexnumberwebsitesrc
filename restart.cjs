const { exec } = require('child_process');
exec('npm run build', (err, stdout, stderr) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(stdout);
});
