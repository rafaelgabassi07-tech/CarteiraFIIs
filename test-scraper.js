import dotenv from 'dotenv';
dotenv.config();
import { scrapeInvestidor10 } from './server/controllers/stockController.js';

async function test() {
  try {
    const res = await scrapeInvestidor10('MXRF11');
    console.log(JSON.stringify(res.dividends.slice(0, 5), null, 2));
  } catch (e) {
    console.error(e.message);
  }
}
test();
