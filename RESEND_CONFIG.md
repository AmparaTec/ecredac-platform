# Configuração Resend para RELIUS E-CREDac

**Status**: ✅ Integração implementada | ⏳ Aguardando chave de API

## O que é Resend?

Resend é um serviço transacional de emails otimizado para desenvolvedores. Substitui soluções como SendGrid, Mailgun, etc.

- **Documentação**: https://resend.com
- **Pricing**: $0.20 por 1000 emails (muito barato)
- **Dashboard**: https://resend.com/dashboard

## Variáveis de Ambiente Necessárias

Adicionar ao arquivo `.env.local` (desenvolvimento) e ao Vercel (produção):

```env
# Resend API Key
# Gere em: https://resend.com/api-keys
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXXXX

# Email de origem
RESEND_FROM_EMAIL=noreply@relius.com.br
RESEND_FROM_NAME=RELIUS E-CREDac
```

## Setup Passo-a-Passo

### 1️⃣ Criar conta no Resend

1. Acesse https://resend.com/signup
2. Crie uma conta com email corporativo
3. Confirme seu email

### 2️⃣ Configurar domínio

Resend suporta envio de qualquer domínio. Para enviar de `noreply@relius.com.br`:

1. No dashboard Resend, vá para "Domains"
2. Clique "Add Domain"
3. Digite: `relius.com.br`
4. Resend te fornecerá registros DNS para adicionar:
   - 1 registro DKIM (para assinatura de email)
   - 1 registro MX (para receber replies)
   - 1 registro SPF (para autenticação)

5. Adicione esses registros no seu registrador de DNS (Ex: Namecheap, AWS Route53, etc)
6. Volte ao Resend e clique "Verify"

### 3️⃣ Gerar API Key

1. No dashboard Resend, vá para "API Keys"
2. Clique "Create API Key"
3. Selecione o domínio `relius.com.br`
4. Copie a chave (formato: `re_XXXXXXXXXXXXXXXXXXXXXXXXXX`)

### 4️⃣ Configurar no Vercel

1. Acesse o projeto Vercel: https://vercel.com/amparas-projects/ecredac-platform
2. Vá para "Settings" → "Environment Variables"
3. Adicione as 3 variáveis:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `RESEND_FROM_NAME`
4. Clique "Save"
5. Redeploy o projeto

### 5️⃣ Testar Envio

Use o endpoint implementado para testar:

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "template": "creditoIndicado",
    "to": "seu.email@company.com",
    "data": {
      "creditId": "ICMS-001",
      "amount": "100000.00",
      "procurador": "João Silva",
      "mensagem": "Tenho cliente interessado"
    }
  }'
```

## Endpoints Implementados

### 1. POST `/api/email/send`

Envia email via Resend usando templates pré-configurados.

**Templates disponíveis:**

- `creditoIndicado`: quando procurador indica crédito a comprador
- `creditoAtivado`: quando crédito é ativado após aceite de termos
- `notificacaoComprador`: quando novo interesse em um crédito

**Exemplo:**
```bash
POST /api/email/send
Content-Type: application/json

{
  "template": "creditoIndicado",
  "to": "buyer@company.com",
  "data": {
    "creditId": "ICMS-001",
    "amount": "100000.00",
    "procurador": "João Silva",
    "mensagem": "Tenho cliente interessado"
  }
}
```

### 2. POST `/api/marketplace/[id]/indicar`

Quando procurador indica um crédito:
- Atualiza `nivel = 'indicado'`
- **TODO**: Envia email via Resend

### 3. POST `/api/marketplace/[id]/ativar`

Quando cliente aceita termos e ativa crédito:
- Atualiza `nivel = 'ativado'`
- Registra aceite em `aceites_termos`
- **TODO**: Envia email via Resend

## Logging de Emails

Todos os emails são registrados na tabela `email_log`:

```sql
SELECT * FROM email_log WHERE sent = false;  -- emails com erro
SELECT * FROM email_log WHERE template = 'creditoIndicado';  -- por template
```

## Próximas Implementações

- [ ] Integrar sendEmailResend() nos endpoints `/indicar` e `/ativar`
- [ ] Criar templates HTML mais robustos com CSS inline
- [ ] Implementar retry automático para emails que falharam
- [ ] Dashboard de análise de emails (abertos, clicados, etc)
- [ ] Suporte a webhooks do Resend (bounce, complaint, etc)

## Troubleshooting

### ❌ "RESEND_API_KEY não configurada"

Verifique:
1. A chave está em `.env.local` (desenvolvimento)
2. A chave está nas Environment Variables do Vercel (produção)
3. Rodou `npm run dev` novamente após adicionar a var

### ❌ "Email bounced" ou "Invalid recipient"

Resend rejeita emails para domínios inválidos. Certifique-se que o email é válido.

### ❌ "DMARC/SPF/DKIM failure"

Você precisa verificar o domínio no Resend (veja passo 2️⃣ acima).

## Referências

- [Docs Resend](https://resend.com/docs)
- [API Reference](https://resend.com/docs/api-reference)
- [Email Best Practices](https://resend.com/docs/best-practices)
