import Link from 'next/link'

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="min-h-screen bg-dark-900 text-slate-600 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/register" className="text-brand-400 hover:text-brand-300 text-sm mb-8 inline-block">
          ← Voltar ao cadastro
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Política de Privacidade</h1>
        <p className="text-sm text-slate-500 mb-8">Última atualização: 05 de abril de 2026</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">1. Introdução</h2>
            <p>
              A AmparaTec Tecnologia Ltda. (&quot;AmparaTec&quot;), operadora da plataforma E-CREDac ICMS,
              está comprometida com a proteção da privacidade e dos dados pessoais dos seus Usuários,
              em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD)
              e demais normas aplicáveis.
            </p>
            <p className="mt-2">
              Esta Política descreve como coletamos, utilizamos, armazenamos e protegemos os dados pessoais
              dos Usuários da Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">2. Dados Coletados</h2>
            <p>Coletamos os seguintes dados pessoais e empresariais:</p>

            <h3 className="text-sm font-semibold text-slate-900 mt-4 mb-2">2.1. Dados fornecidos pelo Usuário:</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li>Nome completo do responsável</li>
              <li>Endereço de e-mail</li>
              <li>CNPJ da empresa</li>
              <li>Razão social e dados cadastrais da empresa (obtidos via consulta à Receita Federal)</li>
              <li>Tipo de operação (cedente ou cessionário)</li>
              <li>Código de assessor (quando aplicável)</li>
            </ul>

            <h3 className="text-sm font-semibold text-slate-900 mt-4 mb-2">2.2. Dados coletados automaticamente:</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li>Endereço IP e dados de geolocalização aproximada</li>
              <li>Tipo de navegador e sistema operacional</li>
              <li>Páginas acessadas e tempo de permanência</li>
              <li>Cookies e identificadores de sessão</li>
            </ul>

            <h3 className="text-sm font-semibold text-slate-900 mt-4 mb-2">2.3. Dados transacionais:</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li>Histórico de ofertas publicadas e transações realizadas</li>
              <li>Valores e condições de créditos negociados</li>
              <li>Documentos fiscais enviados para homologação</li>
              <li>Score de crédito e análise de risco</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">3. Finalidade do Tratamento</h2>
            <p>Os dados pessoais são tratados para as seguintes finalidades:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-500">
              <li>Criação e gestão da conta do Usuário na Plataforma</li>
              <li>Verificação de identidade e validação de CNPJ junto à Receita Federal</li>
              <li>Intermediação e matching entre cedentes e cessionários de créditos de ICMS</li>
              <li>Cálculo de scoring de crédito e análise de risco</li>
              <li>Processamento de pagamentos e cálculo de comissões</li>
              <li>Comunicações sobre transações, atualizações da Plataforma e avisos legais</li>
              <li>Cumprimento de obrigações legais e regulatórias</li>
              <li>Melhoria contínua da Plataforma e desenvolvimento de novos recursos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">4. Base Legal</h2>
            <p>O tratamento de dados pessoais é realizado com base nas seguintes hipóteses legais da LGPD:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-500">
              <li><strong className="text-slate-600">Consentimento</strong> (Art. 7º, I): para coleta de dados no cadastro</li>
              <li><strong className="text-slate-600">Execução de contrato</strong> (Art. 7º, V): para operacionalização das transações</li>
              <li><strong className="text-slate-600">Cumprimento de obrigação legal</strong> (Art. 7º, II): para atendimento de exigências fiscais e tributárias</li>
              <li><strong className="text-slate-600">Legítimo interesse</strong> (Art. 7º, IX): para prevenção de fraudes e melhoria da Plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">5. Compartilhamento de Dados</h2>
            <p>Os dados pessoais poderão ser compartilhados com:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-500">
              <li>Outros Usuários da Plataforma, na medida necessária para a realização de transações</li>
              <li>Prestadores de serviços essenciais (processamento de pagamentos, assinatura digital, infraestrutura em nuvem)</li>
              <li>Autoridades fiscais e tributárias, quando exigido por lei</li>
              <li>Assessores vinculados ao Usuário, para fins de acompanhamento de operações</li>
            </ul>
            <p className="mt-2">
              A AmparaTec não vende, aluga ou comercializa dados pessoais dos Usuários para terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">6. Armazenamento e Segurança</h2>
            <p>
              6.1. Os dados são armazenados em servidores seguros fornecidos pela Supabase (infraestrutura na região
              sa-east-1, São Paulo), com criptografia em trânsito (TLS 1.3) e em repouso (AES-256).
            </p>
            <p className="mt-2">
              6.2. Implementamos medidas técnicas e organizacionais para proteger os dados contra acesso não
              autorizado, perda, alteração ou destruição, incluindo: controle de acesso por função (RLS),
              autenticação multifator e logs de auditoria.
            </p>
            <p className="mt-2">
              6.3. Os dados serão retidos pelo período necessário ao cumprimento das finalidades descritas nesta
              Política, ou pelo prazo exigido pela legislação aplicável (mínimo de 5 anos para documentos fiscais).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">7. Direitos do Titular</h2>
            <p>Conforme a LGPD, o Usuário tem direito a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-500">
              <li>Confirmação da existência de tratamento de seus dados</li>
              <li>Acesso aos dados pessoais coletados</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos</li>
              <li>Portabilidade dos dados a outro fornecedor de serviço</li>
              <li>Eliminação dos dados tratados com base em consentimento</li>
              <li>Informação sobre o compartilhamento de dados com terceiros</li>
              <li>Revogação do consentimento a qualquer momento</li>
            </ul>
            <p className="mt-2">
              Para exercer seus direitos, entre em contato pelo e-mail: <a href="mailto:privacidade@redeampara.com.br" className="text-brand-400 hover:text-brand-300">privacidade@redeampara.com.br</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">8. Cookies</h2>
            <p>
              A Plataforma utiliza cookies essenciais para funcionamento (autenticação e sessão) e cookies
              analíticos para melhoria da experiência do Usuário. Cookies de terceiros para publicidade
              não são utilizados. O Usuário pode gerenciar cookies nas configurações do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">9. Encarregado de Dados (DPO)</h2>
            <p>
              O Encarregado pelo tratamento de dados pessoais da AmparaTec pode ser contactado pelo e-mail:
              <a href="mailto:dpo@redeampara.com.br" className="text-brand-400 hover:text-brand-300 ml-1">dpo@redeampara.com.br</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">10. Alterações nesta Política</h2>
            <p>
              A AmparaTec poderá atualizar esta Política periodicamente. Alterações significativas serão
              comunicadas aos Usuários por e-mail ou notificação na Plataforma com antecedência mínima de
              15 (quinze) dias. O uso continuado da Plataforma após a atualização constitui aceitação
              da nova versão.
            </p>
          </section>

          <section className="border-t border-dark-600 pt-6 mt-8">
            <p className="text-slate-500 text-xs">
              AmparaTec Tecnologia Ltda. — Todos os direitos reservados.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
