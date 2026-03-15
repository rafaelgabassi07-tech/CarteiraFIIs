const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
};

async function test() {
    try {
        const res = await axios.get(`https://investidor10.com.br/acoes/petr4/`, { headers: HEADERS, httpsAgent });
        const data = res.data;
        
        const lines = data.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('tickerId') || lines[i].includes('companyId')) {
                console.log(lines[i].trim());
            }
        }
    } catch (e) {
        console.error(e.message);
    }
}

test();
