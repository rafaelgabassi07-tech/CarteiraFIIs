
const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({ 
    rejectUnauthorized: false
});

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest'
};

async function test() {
    const ticker = 'PETR4';
    const companyId = '2'; // Example ID for PETR4
    const tickerId = '2';
    const url = `https://investidor10.com.br/api/acoes/payout-chart/${companyId}/${tickerId}/${ticker}/3650`;
    
    try {
        console.log(`Fetching ${url}...`);
        const response = await axios.get(url, { 
            headers: { 
                ...HEADERS,
                'Referer': `https://investidor10.com.br/acoes/${ticker.toLowerCase()}/`
            }, 
            httpsAgent 
        });
        console.log('Response data keys:', Object.keys(response.data));
        console.log('Years:', response.data.years);
        console.log('Sample payout entry:', Object.values(response.data.payOutCompanyIndicators || {})[0]);
        console.log('Sample dy entry:', Object.values(response.data.dyTickerIndicators || {})[0]);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();
