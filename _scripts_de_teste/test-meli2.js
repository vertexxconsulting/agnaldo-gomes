const html = `<meta itemprop="price" content="250.00" />`;
const metaPrice = html.match(/<meta[^>]+(?:itemprop="price"|property="product:price:amount")[^>]+content="([0-9.]+)"/i) || 
                  html.match(/<meta[^>]+content="([0-9.]+)"[^>]+(?:itemprop="price"|property="product:price:amount")/i);
if (metaPrice) console.log('Meta Price:', parseFloat(metaPrice[1]));
else console.log('Not found');
