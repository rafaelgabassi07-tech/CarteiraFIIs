import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
    const res = await axios.get('https://investidor10.com.br/fiis/snag11/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(res.data);
    
    let aboutText = '';
    const aboutHeader = $('h2').filter((i, el) => {
        const text = $(el).text().trim().toLowerCase();
        return text.includes('sobre a empresa') || text.includes('sobre o fundo') || text.includes('sobre o ') || text.includes('sobre a ');
    }).first();

    if (aboutHeader.length > 0) {
        const container = aboutHeader.closest('section, .card, .container, div[id*="about"], div[class*="about"]');
        if (container.length > 0) {
            const paragraphs = container.find('p').map((i, el) => $(el).text().trim()).get();
            aboutText = paragraphs.join('\n\n');
        } else {
            const paragraphs = aboutHeader.nextAll('p').map((i, el) => $(el).text().trim()).get();
            aboutText = paragraphs.join('\n\n');
        }
    }

    if (!aboutText) {
        aboutText = $('#about-section p, .company-description p, .about-company p').map((i, el) => $(el).text().trim()).get().join('\n\n');
    }
    
    console.log(aboutText.substring(0, 500));
}
test();
