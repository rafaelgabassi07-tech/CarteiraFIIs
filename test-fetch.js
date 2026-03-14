import fs from 'fs';
import https from 'https';

https.get('https://investidor10.com.br/assets/front/js/company/revenue-bussines-chart-pie.js', { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync('revenue-bussines-chart-pie.js', data);
    console.log('Saved to revenue-bussines-chart-pie.js');
  });
});
