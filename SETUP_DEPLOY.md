# E-CREDac — Guia de Setup e Deploy

## Pré-requisitos
- Node.js 18+ e npm
- Conta no Supabase (https://supabase.com)
- Conta na Vercel (https://vercel.com) — gratuita para hobby
- (Opcional) Clicksign, Pagar.me, Resend para produção

---

## 1. Setup do Supabase

### 1.1 Criar projeto
1. Acesse https://supabase.com/dashboard
2. Clique "New project"
3. Nome: `ecredac-platform`
4. Região: São Paulo (South America East)
5. Senha do banco: anote em local seguro

### 1.2 Executar migration
1. No painel do Supabase, vá em **SQL Editor**
2. Cole o conteúdo de `supabase/migrations/001_initial_schema.sql`
3. Execute (Run)
4. Verifique que todas as tabelas foram criadas em **Table Editor**

### 1.3 Copiar credenciais
No painel, vá em **Settings → API**:
- `Project URL` → será `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → será `SUPABASE_SERVICE_ROLE_KEY` (NÃO exponha no frontend)

### 1.4 Configurar Auth
1. Vá em **Authentication → Settings**
2. Em "Site URL", coloque: `https://seu-dominio.vercel.app`
3. Em "Redirect URLs", adicione: `https://seu-dominio.vercel.app/**`
4. (Opcional) Habilite OAuth com Google, Microsoft

### 1.5 Habilitar Realtime
1. Vá em **Database → Replication**
2. Ative Realtime para as tabelas: `matches`, `notifications`, `credit_listings`, `credit_requests`

---

## 2. Setup Local

### 2.1 Instalar dependências
```bash
cd ecredac-platform
npm install
```

### 2.2 Configurar variáveis de ambiente
```bash
cp .env.local.example .env.local
```

Edite `.env.local` com suas credenciais:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ReceitaWS (verificação de CNPJ)
CNPJ_API_URL=https://receitaws.com.br/v1/cnpj
CNPJ_API_KEY=seu-token-receitaws

# Clicksign (assinatura digital) — configurar depois
CLICKSIGN_API_KEY=
CLICKSIGN_ENV=sandbox

# Pagar.me (pagamentos) — configurar depois
PAGARME_API_KEY=

# Resend (e-mails)
RESEND_API_KEY=
RESEND_FROM=noreply@ecredac.com.br

# URL do site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2.3 Rodar localmente
```bash
npm run dev
```
Acesse http://localhost:3000

---

## 3. Deploy na Vercel

### 3.1 Via CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

### 3.2 Via GitHub (recomendado)
1. Crie um repositório no GitHub
2. Push do código:
```bash
git init
git add .
git commit -m "E-CREDac: plataforma de intermediação de créditos de ICMS"
git remote add origin https://github.com/seu-usuario/ecredac-platform.git
git push -u origin main
```
3. Na Vercel, importe o repositório
4. Configure as variáveis de ambiente (todas do `.env.local`)
5. Deploy automático a cada push

### 3.3 Configurar domínio
1. Na Vercel, vá em **Settings → Domains**
2. Adicione `ecredac.com.br` ou seu domínio
3. Configure o DNS conforme instruções da Vercel
4. Atualize `NEXT_PUBLIC_SITE_URL` e Site URL no Supabase Auth

---

## 4. Integrações de Produção

### 4.1 ReceitaWS (CNPJ)
- Cadastro: https://receitaws.com.br
- Plano básico gratuito (3 consultas/minuto)
- Plano comercial para volume maior

### 4.2 Clicksign (Assinatura Digital)
- Cadastro: https://clicksign.com
- Sandbox para testes: `CLICKSIGN_ENV=sandbox`
- API docs: https://developers.clicksign.com
- Fluxo: criar documento → adicionar signatários → webhook de conclusão

### 4.3 Pagar.me (Pagamentos)
- Cadastro: https://pagar.me
- Suporta PIX, TED, Boleto
- Split de pagamento para taxa da plataforma
- Webhook para confirmação de pagamento

### 4.4 Resend (E-mails)
- Cadastro: https://resend.com
- Verificar domínio para envio
- Templates para: novo match, pagamento confirmado, crédito transferido, alertas de expiração

---

## 5. Checklist de Produção

### Segurança
- [ ] Todas as variáveis sensíveis em env vars (não no código)
- [ ] RLS habilitado em todas as tabelas do Supabase
- [ ] CORS configurado corretamente
- [ ] Rate limiting na API (Vercel Edge Config)
- [ ] Headers de segurança (CSP, HSTS)

### LGPD
- [ ] Termos de uso e política de privacidade publicados
- [ ] Consentimento LGPD registrado no cadastro
- [ ] Audit log funcionando para todas as operações
- [ ] Mecanismo de exportação de dados (DSAR)
- [ ] Mecanismo de exclusão de dados

### Funcional
- [ ] Matching engine rodando no intervalo configurado (cron)
- [ ] Notificações por e-mail ativas
- [ ] Alertas de expiração de crédito funcionando
- [ ] Webhook do Clicksign configurado
- [ ] Webhook do Pagar.me configurado

### Monitoramento
- [ ] Vercel Analytics habilitado
- [ ] Supabase Dashboard monitorando queries
- [ ] Alertas configurados para erros 500
- [ ] Backup automático do banco (Supabase faz por padrão)

---

## 6. Cron Jobs (Matching Automático)

Para rodar o matching engine periodicamente, crie `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/matching",
      "schedule": "0 * * * *"
    }
  ]
}
```

Isso executa o matching a cada hora. Para tempo real, use Supabase Edge Functions com triggers.

---

## 7. Estrutura do Projeto

```
ecredac-platform/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login e Registro
│   │   ├── (dashboard)/     # Páginas autenticadas
│   │   │   ├── dashboard/   # Visão geral
│   │   │   ├── pipeline/    # Kanban 8 fases
│   │   │   ├── marketplace/ # Ofertas de crédito
│   │   │   ├── demandas/    # Necessidades de crédito
│   │   │   ├── matching/    # Engine de matching
│   │   │   ├── transacoes/  # Histórico
│   │   │   ├── empresas/    # Diretório
│   │   │   └── admin/       # Configurações
│   │   └── api/
│   │       ├── auth/        # CNPJ verify, logout
│   │       ├── listings/    # CRUD de ofertas
│   │       ├── matching/    # Engine
│   │       └── transactions/# CRUD de transações
│   ├── components/
│   │   ├── ui/              # Componentes reutilizáveis
│   │   └── sidebar.tsx      # Navegação
│   ├── lib/
│   │   ├── supabase/        # Clients (browser, server, admin)
│   │   └── utils.ts         # Helpers e constantes
│   └── types/
│       └── database.ts      # TypeScript interfaces
├── supabase/
│   └── migrations/          # SQL schema
├── .env.local.example
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Suporte

Para dúvidas sobre o código ou arquitetura, consulte:
- `ARQUITETURA_E-CREDac.md` — Documentação completa V1
- `ARQUITETURA_V2_MULTI-CREDITO.md` — Expansão multi-crédito
- `ecredac-plataforma.html` — MVP funcional standalone

**E-CREDac** — O maior broker de créditos de ICMS do Brasil.
