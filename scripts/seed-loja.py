#!/usr/bin/env python3
"""Seed da loja Agnaldo Gomes."""
import json, urllib.request, os

# Tenta encontrar .env.local
possible_paths = [
    ".env.local",
    "E:/Anderson/Agnaldo Gomes/.env.local",
    "e:/Anderson/Agnaldo Gomes/.env.local",
    os.path.expanduser("~/Ag naldo Gomes/.env.local"),
    "/e/Anderson/Agnaldo Gomes/.env.local",
]
ENV_PATH = None
for p in possible_paths:
    if os.path.exists(p):
        ENV_PATH = p
        break

if not ENV_PATH:
    print("ERRO: .env.local nao encontrado em nenhum caminho:")
    for p in possible_paths:
        print(f"  {p}")
    sys.exit(1)

print(f"Lendo: {ENV_PATH}")

with open(ENV_PATH) as f:
    for line in f:
        line = line.strip()
        if line.startswith("NEXT_PUBLIC_SUPABASE_URL="):
            SUPABASE_URL = line.split("=",1)[1].strip()
        elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
            SERVICE_KEY = line.split("=",1)[1].strip()

print(f"SUPABASE_URL: {SUPABASE_URL}")
print(f"SERVICE_KEY: {SERVICE_KEY[:20]}...")

def supabase_insert(product):
    url = f"{SUPABASE_URL}/rest/v1/products"
    data = json.dumps(product).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:200]
        return {"error": e.code, "body": body}

def supabase_list(columns="*", limit=30):
    url = f"{SUPABASE_URL}/rest/v1/products?select={columns}&limit={limit}"
    req = urllib.request.Request(url, headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Prefer": "return=representation",
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}

SEED = [
    {"name":"Creme para Pentear Premium - Fixacao Forte 500ml","type":"LOCAL_STOCK","ml_link":None,"category":"Finalizacao & Styling","description":"Formulação exclusiva para finalizar com brilho e definição sem pesar.","price":69.90,"stock_quantity":24,"active":True,"image_url":"https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800&h=800"},
    {"name":"Oleo Reparador de Pontas - Argan & Vitamin E 100ml","type":"LOCAL_STOCK","ml_link":None,"category":"Tratamento Capilar","description":"Repara pontas duplas e selam a fibra capilar com brilho espelhado.","price":89.90,"stock_quantity":18,"active":True,"image_url":"https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&q=80&w=800&h=800"},
    {"name":"Shampoo Pos-Coloracao Anti-Desbotavel 300ml","type":"LOCAL_STOCK","ml_link":None,"category":"Coloracao Profissional","description":"Sistema com filtro UV e pigmentos encapsulados que prolongam a cor.","price":54.90,"stock_quantity":32,"active":True,"image_url":"https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&q=80&w=800&h=800"},
    {"name":"Macara Reconstrutora Intensiva - Queratina Pura 450g","type":"LOCAL_STOCK","ml_link":None,"category":"Tratamento Capilar","description":"Reconstrucao profunda semanal para cabelos danificados por quimica.","price":79.90,"stock_quantity":15,"active":True,"image_url":"https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&q=80&w=800&h=800"},
    {"name":"Secador Profissional 2400W com Ions Negativos","type":"LOCAL_STOCK","ml_link":None,"category":"Ferramentas & Equipamentos","description":"Motor AC de longa duracao, 6 temperaturas e jato de ar frio.","price":449.90,"stock_quantity":8,"active":True,"image_url":"https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&q=80&w=800&h=800"},
    {"name":"Tesoura de Corte Japonesa 6.0 Aço Inox - Agnaldo Edition","type":"LOCAL_STOCK","ml_link":None,"category":"Ferramentas & Equipamentos","description":"Tesoura de corte profissional em aço inox japones com fio cirurgico.","price":329.90,"stock_quantity":10,"active":True,"image_url":"https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&q=80&w=800&h=800"},
    {"name":"Pomada Modeladora Matte - Efeito Natural 120g","type":"LOCAL_STOCK","ml_link":None,"category":"Barbearia","description":"Fixacao media-alta com acabamento matte, sem brilho e sem efeito molhado.","price":49.90,"stock_quantity":27,"active":True,"image_url":"https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800&h=800"},
    {"name":"Kit Visagismo Completo - Agnaldo Gomes","type":"LOCAL_STOCK","ml_link":None,"category":"Tratamento Capilar","description":"Kit exclusivo com shampoo, condicionador, oleo reparador e guia em PDF.","price":199.90,"stock_quantity":12,"active":True,"image_url":"https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800&h=800"},
    {"name":"Chapinha Profissional Titanio - Compre no Mercado Livre","type":"AFFILIATE_ML","ml_link":"https://lista.mercadolivre.com.br/chapinha-profissional-titanio","category":"Ferramentas & Equipamentos","description":"Placas de titanio com aquecimento rapido e temperatura ate 230C.","price":None,"stock_quantity":0,"active":True,"image_url":"https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&q=80&w=800&h=800"},
    {"name":"Maquina de Corte Profissional - Compre no Mercado Livre","type":"AFFILIATE_ML","ml_link":"https://lista.mercadolivre.com.br/maquina-de-corte-profissional","category":"Barbearia","description":"Cortador profissional sem fio com bateria de litio e kit de pantes inclusos.","price":None,"stock_quantity":0,"active":True,"image_url":"https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=800&h=800"},
]

print(f"\n=== Seed: {len(SEED)} produtos ===")
inserted = 0; errors = 0
for i, prod in enumerate(SEED):
    print(f"[{i+1}/{len(SEED)}] {prod['name'][:55]}...")
    res = supabase_insert(prod)
    if isinstance(res, list) and len(res) > 0:
        inserted += 1
        print(f"  OK id={res[0].get('id','?')}")
    else:
        errors += 1
        print(f"  ERRO: {res.get('error','?')} - {res.get('body','')[:100]}")

print(f"\n=== FIM: Inseridos: {inserted}, Erros: {errors} ===")

dados = supabase_list("id,name,type,ml_link,category,price,stock_quantity,image_url,active,created_at", 30)
if isinstance(dados, list) and len(dados) > 0:
    print(f"Total no DB: {len(dados)} produtos")
    for p in dados:
        ml = "YES" if p.get("ml_link") else "NO"
        img = "YES" if p.get("image_url") else "NO"
        print(f"  - {p.get('name','?')[:55]} [{p.get('type','?')}] ML={ml} img={img} price={p.get('price')} stock={p.get('stock_quantity')}")
else:
    print(f"Erro ao listar: {dados}")
