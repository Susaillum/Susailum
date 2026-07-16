# Site Susailum — design & vibecode

Site completo do estúdio: frontend multi-página + backend Node com segurança.

## Estrutura

```
site/
├── index.html        → Início (manifesto, especialidades, serviços, destaques)
├── trabalhos.html    → Portfólio (11 clientes; a tonalidade muda por cliente ao rolar)
├── servicos.html     → O que fazemos + processo
├── estudio.html      → História, quem somos (Lucca Lyra & Marcos Ribeiro), princípios
├── contato.html      → Formulário + WhatsApp/e-mail/Instagram
├── favicon.svg, robots.txt, sitemap.xml
├── assets/           → css, js, imagens otimizadas (89), vídeos comprimidos (5)
└── server/           → backend Node (Express)
```

## Como rodar

**Só o frontend (mais simples):** abra o `index.html` no navegador, ou hospede a
pasta `site/` inteira no Netlify / Vercel / GitHub Pages / Cloudflare Pages.
O formulário funciona via mailto quando não há backend.

**Com backend (formulário salvo + e-mail):**

```bash
cd site/server
npm install
npm start          # → http://localhost:3000
```

Mensagens do formulário ficam em `server/data/messages.json`.
Para receber por e-mail, copie `.env.example` para `.env` e preencha o SMTP
(Gmail: use uma "senha de app"). Hospedagem sugerida: Render, Railway ou VPS.

## Segurança (o que o backend faz)

- **Helmet + CSP** — headers de segurança e política que só permite scripts,
  fontes e mídia do próprio site (fontes do Google liberadas explicitamente).
- **Rate limiting** — 300 req/15min por IP no site; **5 mensagens/hora** no formulário.
- **Validação e sanitização** — limites de tamanho, e-mail validado, caracteres
  de controle removidos; payload máximo de 32 kb.
- **Honeypot anti-spam** — campo invisível que bots preenchem e humanos não.
- **Sem dados sensíveis no cliente** — nenhuma chave ou senha vai para o HTML.

## SEO

- Title/description/keywords únicos por página + canonical.
- Open Graph e Twitter Card (preview bonito no WhatsApp/redes) com `assets/img/og.jpg`.
- Dados estruturados JSON-LD (Organization, WebSite, AboutPage, ContactPage…).
- `sitemap.xml` + `robots.txt`.
- Favicon SVG + ícone 512px (`assets/img/icon-512.png`).

**IMPORTANTE:** o domínio está como `https://susailum.com.br` nos metadados.
Quando definirem o domínio real, troquem em: todas as páginas (canonical/og:url),
`sitemap.xml` e `robots.txt`. Depois cadastrem no
[Google Search Console](https://search.google.com/search-console) e enviem o sitemap —
é isso que faz o site aparecer "bonitinho" no Google.

## Tonalidade por cliente

Em `trabalhos.html`, cada case tem `data-case-theme="…"`. Ao rolar, o JS troca o
atributo `data-theme` do `<body>` e o CSS (em `assets/css/style.css`) faz a
transição de cores. Para ajustar a paleta de um cliente, edite as variáveis do
tema correspondente no topo do CSS.
