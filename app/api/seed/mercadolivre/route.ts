import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

async function mlSearch(query: string, limit = 5, offset = 0) {
  const url = `https://api.mercadolivre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`ML search failed: ${res.status}`);
  return res.json();
}

async function insertProduct(product: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(product),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Insert failed ${res.status}: ${body}`);
  }
  return res.json();
}

function extractCategoryName(categoryId: string): string {
  const map: Record<string, string> = {
    MLB10543: 'Ferramentas & Equipamentos',
    MLB10544: 'Ferramentas & Equipamentos',
    MLB10545: 'Ferramentas & Equipamentos',
    MLB10546: 'Eletroportáteis',
  };
  return map[categoryId] ?? 'Geral';
}

export async function GET() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json(
      { error: 'Credenciais Supabase não configuradas. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    );
  }

  const queries = [
    'chapinha profissional titanio',
    'maquina de corte sem fio profissional',
    'tesoura profissional inox japones',
    'draps profissional finalizacao',
    'tintura capilar profissional',
    'shampoo profissional barbearia',
    'conditioner profissional',
    'esmalte unha profissional set',
    'acetone profissional',
    'brush set profissional',
  ];

  const seenTitles = new Set<string>();
  const toInsert: Array<Record<string, unknown>> = [];
  let totalFound = 0;

  for (const query of queries) {
    try {
      const result = await mlSearch(query, 8);
      const results = result.results as Array<Record<string, unknown>> | undefined;
      if (!results) continue;

      totalFound += results.length;
      for (const item of results) {
        const title = (item.title as string)?.trim();
        if (!title || seenTitles.has(title)) continue;
        seenTitles.add(title);

        const permalink = item.permalink as string;
        if (!permalink) continue;

        const thumbnail = (item.thumbnail as string) || '';

        toInsert.push({
          name: title.slice(0, 200),
          type: 'AFFILIATE_ML',
          ml_link: permalink,
          category: (item.category_id as string) || 'Geral',
          description: '',
          price: null,
          stock_quantity: 0,
          active: true,
          image_url: thumbnail,
          rating: 4.5,
          reviews: 0,
          featured: false,
          tagline: null,
        });

        if (toInsert.length >= 50) break;
      }
    } catch (err) {
      console.error('Erro na busca', query, ':', err);
    }

    if (toInsert.length >= 50) break;
  }

  if (toInsert.length === 0) {
    return NextResponse.json(
      { message: 'Nenhum produto encontrado nas buscas do Mercado Livre.' },
      { status: 200 }
    );
  }

  let inserted = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (const product of toInsert) {
    try {
      await insertProduct(product);
      inserted++;
    } catch (err) {
      errors++;
      errorDetails.push(String((err as Error).message).slice(0, 200));
    }
  }

  return NextResponse.json({
    message: `Seed concluído. ${inserted} inseridos, ${errors} erros.`,
    stats: {
      totalBuscado: totalFound,
      totalInseridos: inserted,
      totalErros: errors,
      produtos: toInsert.length,
    },
    errors: errorDetails.slice(0, 10),
  });
}
