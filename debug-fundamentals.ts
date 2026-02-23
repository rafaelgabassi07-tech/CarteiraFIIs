
import axios from 'axios';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest'
};

async function run() {
    // WEGE3 IDs: companyId=25, tickerId=22
    const companyId = 25;
    const tickerId = 22;
    const ticker = 'WEGE3';

    try {
        // 1. Revenue & Profit
        console.log('--- Revenue & Profit ---');
        const url1 = `https://investidor10.com.br/api/balancos/receitaliquida/chart/${companyId}/3650/false/`;
        const res1 = await axios.get(url1, { headers: HEADERS });
        console.log(JSON.stringify(res1.data).substring(0, 500));

        // 2. Price x Profit
        console.log('\n--- Price x Profit ---');
        const url2 = `https://investidor10.com.br/api/cotacao-lucro/${ticker}/adjusted/`;
        const res2 = await axios.get(url2, { headers: HEADERS });
        console.log(JSON.stringify(res2.data).substring(0, 500));

        // 3. Equity
        console.log('\n--- Equity ---');
        const url3 = `https://investidor10.com.br/api/balancos/ativospassivos/chart/${companyId}/3650/`;
        const res3 = await axios.get(url3, { headers: HEADERS });
        console.log(JSON.stringify(res3.data).substring(0, 500));

        // 4. Payout
        console.log('\n--- Payout ---');
        const url4 = `https://investidor10.com.br/api/acoes/payout-chart/${companyId}/${tickerId}/${ticker}/3650`;
        const res4 = await axios.get(url4, { headers: HEADERS });
        console.log(JSON.stringify(res4.data).substring(0, 500));

    } catch (e) {
        console.error(e);
    }
}

run();
