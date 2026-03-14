const https = require('https');

https.get('https://investidor10.com.br/acoes/grnd3/', { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const lines = data.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes('receita')) {
        console.log(`Line ${i}: ${lines[i].trim()}`);
      }
    }
  });
});
