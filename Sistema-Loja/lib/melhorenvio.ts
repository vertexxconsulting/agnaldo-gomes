export interface ShippingRequest {
  fromCep: string;
  toCep: string;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    weight?: number;
    width?: number;
    height?: number;
    length?: number;
  }>;
}

export interface ShippingOption {
  id: number;
  name: string;
  price: number;
  delivery_time: number;
  company: {
    name: string;
    picture: string;
  };
  error?: string;
}

export async function calculateShippingRates(request: ShippingRequest): Promise<ShippingOption[]> {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  
  if (!token) {
    console.warn('MELHOR_ENVIO_TOKEN não configurado. Retornando fallback.');
    return mockShippingRates(request.toCep);
  }

  // Mapear produtos para o formato do Melhor Envio
  // Se os produtos não tiverem dimensões reais no DB, usamos valores padrão (1kg, caixa 20x15x15)
  const products = request.items.map(item => ({
    id: item.id,
    weight: item.weight || 0.5,
    width: item.width || 15,
    height: item.height || 15,
    length: item.length || 20,
    insurance_value: item.price,
    quantity: item.quantity,
  }));

  const payload = {
    from: {
      postal_code: request.fromCep.replace(/\D/g, '')
    },
    to: {
      postal_code: request.toCep.replace(/\D/g, '')
    },
    products
  };

  try {
    // Usando a API sandbox por padrão caso haja 'sandbox' na chave ou NEXT_PUBLIC_SITE_URL for localhost
    const isSandbox = token.includes('sandbox') || process.env.NODE_ENV !== 'production';
    const baseUrl = isSandbox 
      ? 'https://sandbox.melhorenvio.com.br/api/v2' 
      : 'https://www.melhorenvio.com.br/api/v2';

    const response = await fetch(`${baseUrl}/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'AgnaldoGomesApp (suporte@vertexx.com.br)'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API Melhor Envio:', errorText);
      return mockShippingRates(request.toCep);
    }

    const data = await response.json();
    
    // Filtra as opções que não têm erro e retorna formatado
    const validOptions: ShippingOption[] = data
      .filter((option: any) => !option.error)
      .map((option: any) => ({
        id: option.id,
        name: option.name,
        price: parseFloat(option.price),
        delivery_time: option.delivery_time,
        company: {
          name: option.company.name,
          picture: option.company.picture
        }
      }));

    return validOptions;

  } catch (error) {
    console.error('Falha ao calcular frete com Melhor Envio', error);
    return mockShippingRates(request.toCep);
  }
}

// Fallback caso a API falhe ou token não esteja presente
function mockShippingRates(cep: string): ShippingOption[] {
  const isLocal = cep.startsWith('8426') || cep.startsWith('8427'); // Telêmaco Borba
  
  if (isLocal) {
    return [
      {
        id: 9991,
        name: 'Motoboy / Retirada',
        price: 15.00,
        delivery_time: 1,
        company: { name: 'Entrega Local', picture: '' }
      }
    ];
  }

  return [
    {
      id: 1, // PAC
      name: 'PAC',
      price: 28.50,
      delivery_time: 7,
      company: { name: 'Correios', picture: 'https://s3.sa-east-1.amazonaws.com/portal-me/company-logos/correios.png' }
    },
    {
      id: 2, // SEDEX
      name: 'SEDEX',
      price: 45.90,
      delivery_time: 3,
      company: { name: 'Correios', picture: 'https://s3.sa-east-1.amazonaws.com/portal-me/company-logos/correios.png' }
    }
  ];
}
