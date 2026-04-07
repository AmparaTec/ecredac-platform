/**
 * Contract Generator — Template + ClickSign Integration
 *
 * Generates HTML contract from transaction data and sends to ClickSign for signature
 */

import { createServerSupabase } from '@/lib/supabase/server'

export interface TransactionData {
  id: string
  buyer_cnpj: string
  buyer_name: string
  seller_cnpj: string
  seller_name: string
  credit_amount: number
  credit_type: string         // PIS | COFINS | ICMS | IPI
  discount_percentage: number
  price_per_real: number
  payment_terms: string       // 'à vista' | '30 dias' | '60 dias'
  verification_score: number
}

export interface ContractResult {
  success: boolean
  document_id?: string
  document_url?: string
  signature_request_id?: string
  error?: string
}

/**
 * Generate HTML contract from transaction data
 */
function generateContractHtml(data: TransactionData): string {
  const finalValue = Math.round(data.credit_amount * data.price_per_real * 100) / 100
  const discountAmount = data.credit_amount - finalValue

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrato de Transferência de Crédito Tributário</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #fff;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header p {
      margin: 5px 0;
      color: #666;
      font-size: 13px;
    }
    section {
      margin-bottom: 25px;
    }
    .section-title {
      background: #f5f5f5;
      padding: 10px 15px;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      margin-bottom: 15px;
      border-left: 4px solid #ff6b35;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 15px;
    }
    .field {
      margin-bottom: 12px;
    }
    .field-label {
      font-weight: 600;
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .field-value {
      font-size: 14px;
      color: #333;
      border-bottom: 1px solid #ddd;
      padding: 8px 0;
      min-height: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    th {
      background: #f5f5f5;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      border-bottom: 1px solid #ddd;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #eee;
      font-size: 13px;
    }
    .amount {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    .total-row {
      background: #f5f5f5;
      font-weight: 600;
    }
    .signature-area {
      margin-top: 40px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }
    .signature-block {
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 40px;
      padding-top: 10px;
      font-size: 12px;
    }
    .timestamp {
      color: #999;
      font-size: 11px;
      margin-top: 5px;
    }
    .score-badge {
      display: inline-block;
      background: #4CAF50;
      color: white;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: 600;
    }
    .warning {
      background: #fffbea;
      border-left: 4px solid #ff9800;
      padding: 12px;
      margin: 15px 0;
      font-size: 13px;
      color: #e65100;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>CONTRATO DE TRANSFERÊNCIA DE CRÉDITO TRIBUTÁRIO</h1>
    <p>Realizado através da Plataforma eCREDAC — AmparaTec</p>
  </div>

  <section>
    <div class="section-title">1. PARTES CONTRATANTES</div>
    <div class="grid-2">
      <div>
        <div class="field">
          <div class="field-label">Vendedor (Cessionário)</div>
          <div class="field-value">${data.seller_name}</div>
        </div>
        <div class="field">
          <div class="field-label">CNPJ</div>
          <div class="field-value">${formatCnpj(data.seller_cnpj)}</div>
        </div>
      </div>
      <div>
        <div class="field">
          <div class="field-label">Comprador (Cessionária)</div>
          <div class="field-value">${data.buyer_name}</div>
        </div>
        <div class="field">
          <div class="field-label">CNPJ</div>
          <div class="field-value">${formatCnpj(data.buyer_cnpj)}</div>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="section-title">2. OBJETO DO CONTRATO</div>
    <table>
      <tr>
        <th>Descrição</th>
        <th class="amount">Valor (R$)</th>
      </tr>
      <tr>
        <td>Crédito Tributário (${data.credit_type})</td>
        <td class="amount">${formatCurrency(data.credit_amount)}</td>
      </tr>
      <tr>
        <td>Score de Verificação</td>
        <td class="amount"><span class="score-badge">${data.verification_score}/100</span></td>
      </tr>
      <tr>
        <td>Desconto Aplicado</td>
        <td class="amount">-${formatCurrency(discountAmount)}</td>
      </tr>
      <tr class="total-row">
        <td>VALOR FINAL DA TRANSFERÊNCIA</td>
        <td class="amount">${formatCurrency(finalValue)}</td>
      </tr>
    </table>
    <div class="field">
      <div class="field-label">Preço por Real de Crédito</div>
      <div class="field-value">R$ ${data.price_per_real.toFixed(4)}</div>
    </div>
  </section>

  <section>
    <div class="section-title">3. CONDIÇÕES DE PAGAMENTO</div>
    <div class="field">
      <div class="field-label">Prazo de Pagamento</div>
      <div class="field-value">${data.payment_terms}</div>
    </div>
    <div class="warning">
      <strong>IMPORTANTE:</strong> O pagamento será realizado via transferência bancária. O crédito tributário será transferido para a companhia compradora após confirmação do pagamento.
    </div>
  </section>

  <section>
    <div class="section-title">4. RESPONSABILIDADES E GARANTIAS</div>
    <div class="field">
      <div class="field-label">Declaração do Vendedor</div>
      <div class="field-value" style="border: none; padding: 0;">
        <p>O vendedor declara que:</p>
        <ul>
          <li>É proprietário legítimo do crédito tributário descrito neste contrato;</li>
          <li>O crédito não possui qualquer restrição, bloqueio ou limitação;</li>
          <li>Todos os dados fornecidos são precisos e verdadeiros;</li>
          <li>O crédito foi obtido de forma legal e está regularizado perante a Fazenda Pública.</li>
        </ul>
      </div>
    </div>
  </section>

  <section>
    <div class="section-title">5. ASSINATURAS ELETRÔNICAS</div>
    <div class="signature-area">
      <div class="signature-block">
        <div>Vendedor (Cessionário)</div>
        <div class="signature-line">
          <div class="timestamp">Data: ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>
      <div class="signature-block">
        <div>Comprador (Cessionária)</div>
        <div class="signature-line">
          <div class="timestamp">Data: ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>
    </div>
  </section>
</body>
</html>`
}

function formatCnpj(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, '')
  return `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5, 8)}/${clean.substring(8, 12)}-${clean.substring(12)}`
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Create document in ClickSign and save record
 */
export async function gerarContratoTransferencia(
  supabase: ReturnType<typeof createServerSupabase>,
  transactionId: string
): Promise<ContractResult> {
  try {
    // 1. Fetch transaction data
    const { data: transaction, error: fetchError } = await (supabase as any)
      .from('transactions')
      .select(`
        id,
        buyer_cnpj,
        buyer_name:buyers(name),
        seller_cnpj,
        seller_name:sellers(name),
        credit_amount,
        credit_type,
        discount_percentage,
        price_per_real,
        payment_terms,
        verification_score
      `)
      .eq('id', transactionId)
      .single()

    if (fetchError || !transaction) {
      return {
        success: false,
        error: `Transação não encontrada: ${fetchError?.message || 'unknown'}`
      }
    }

    // 2. Generate HTML contract
    const htmlContent = generateContractHtml({
      id: transaction.id,
      buyer_cnpj: transaction.buyer_cnpj,
      buyer_name: transaction.buyer_name?.name || 'Não informado',
      seller_cnpj: transaction.seller_cnpj,
      seller_name: transaction.seller_name?.name || 'Não informado',
      credit_amount: transaction.credit_amount,
      credit_type: transaction.credit_type,
      discount_percentage: transaction.discount_percentage,
      price_per_real: transaction.price_per_real,
      payment_terms: transaction.payment_terms,
      verification_score: transaction.verification_score
    })

    // 3. Create document in ClickSign
    const clickSignApiKey = process.env.CLICKSIGN_API_KEY
    if (!clickSignApiKey) {
      return {
        success: false,
        error: 'CLICKSIGN_API_KEY não configurada'
      }
    }

    const formData = new FormData()
    const blob = new Blob([htmlContent], { type: 'text/html' })
    formData.append('document[archive]', blob, `contrato-${transactionId}.html`)
    formData.append('document[folder_id]', process.env.CLICKSIGN_FOLDER_ID || '')
    formData.append('document[deadline_at]', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())

    const clickSignResponse = await fetch('https://api.clicksign.com/v1/documents', {
      method: 'POST',
      headers: {
        'X-API-TOKEN': clickSignApiKey,
      },
      body: formData,
    })

    if (!clickSignResponse.ok) {
      const errorData = await clickSignResponse.json()
      return {
        success: false,
        error: `ClickSign error: ${errorData.message || 'unknown'}`
      }
    }

    const documentData = await clickSignResponse.json()
    const documentId = documentData.document?.id || documentData.id

    // 4. Save document record in database
    const { error: insertError } = await (supabase as any)
      .from('documents')
      .insert({
        transaction_id: transactionId,
        type: 'contract_transfer',
        title: `Contrato - Transação ${transactionId}`,
        clicksign_document_id: documentId,
        clicksign_url: documentData.document?.url || null,
        status: 'pending_signature',
        created_at: new Date().toISOString(),
        metadata: {
          seller_cnpj: transaction.seller_cnpj,
          buyer_cnpj: transaction.buyer_cnpj,
          credit_amount: transaction.credit_amount,
        }
      })

    if (insertError) {
      return {
        success: false,
        error: `Erro ao salvar documento: ${insertError.message}`
      }
    }

    // 5. Create signature requests for both parties
    const signerList = [
      {
        email: process.env.SELLER_EMAIL || 'seller@example.com',
        act: 'sign',
        name: transaction.seller_name?.name || 'Vendedor'
      },
      {
        email: process.env.BUYER_EMAIL || 'buyer@example.com',
        act: 'sign',
        name: transaction.buyer_name?.name || 'Comprador'
      }
    ]

    for (const signer of signerList) {
      await fetch(`https://api.clicksign.com/v1/documents/${documentId}/signers`, {
        method: 'POST',
        headers: {
          'X-API-TOKEN': clickSignApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signer: {
            email: signer.email,
            act: signer.act,
            name: signer.name,
          }
        }),
      })
    }

    return {
      success: true,
      document_id: documentId,
      document_url: documentData.document?.url || null,
      signature_request_id: documentId
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}
