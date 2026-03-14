
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const httpsAgent = new https.Agent({ 
    rejectUnauthorized: false
});

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest'
};

async function getIds(ticker, type) {
    const url = `https://investidor10.com.br/${type}/${ticker.toLowerCase()}/`;
    try {
        const { data } = await axios.get(url, { headers: HEADERS, httpsAgent });
        const $ = cheerio.load(data);
        
        const scripts = $('script').text();
        
        const idMatch = scripts.match(/id:\s*(\d+)/);
        const companyIdMatch = scripts.match(/companyId:\s*['"]?(\d+)['"]?/) || scripts.match(/company_id:\s*['"]?(\d+)['"]?/);
        const tickerIdMatch = scripts.match(/tickerId:\s*['"]?(\d+)['"]?/) || scripts.match(/ticker_id:\s*['"]?(\d+)['"]?/);
        
        console.log('idMatch:', idMatch ? idMatch[1] : 'null');
        console.log('companyIdMatch:', companyIdMatch ? companyIdMatch[1] : 'null');
        console.log('tickerIdMatch:', tickerIdMatch ? tickerIdMatch[1] : 'null');

        const revenueMatch = data.match(/\/api\/balancos\/receitaliquida\/chart\/(\d+)\//);
        console.log('revenueMatch:', revenueMatch ? revenueMatch[1] : 'null');

        return {
            id: idMatch ? idMatch[1] : null,
            companyId: companyIdMatch ? companyIdMatch[1] : null,
            tickerId: tickerIdMatch ? tickerIdMatch[1] : null
        };
    } catch (e) {
        console.error(e.message);
        return null;
    }
}

getIds('PETR4', 'acoes').then(console.log);
