const html = `<span class="andes-money-amount__fraction" aria-hidden="true">1.250</span><span class="andes-money-amount__cents andes-money-amount__cents--superscript-36" aria-hidden="true">50</span>`;
const fractionMatch = html.match(/<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([^<]+)<\/span>/i);
const centsMatch = html.match(/<span[^>]*class="[^"]*andes-money-amount__cents[^"]*"[^>]*>([^<]+)<\/span>/i);

if (fractionMatch) {
  const fraction = fractionMatch[1].replace(/\D/g, ''); // 503
  const cents = centsMatch ? centsMatch[1].replace(/\D/g, '') : '00'; // 13
  console.log('Price:', parseFloat(`${fraction}.${cents}`));
} else {
  console.log('Not found');
}
