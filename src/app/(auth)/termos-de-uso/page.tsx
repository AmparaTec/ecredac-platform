import Link from 'next/link'

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-dark-900 text-slate-300 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/register" className="text-brand-400 hover:text-brand-300 text-sm mb-8 inline-block">
          ← Voltar ao cadastro
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Termos de Uso</h1>
        <p className="text-sm text-slate-500 mb-8">Última atualização: 05 de abril de 2026</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar a plataforma E-CREDac ICMS (&quot;Plataforma&quot;), operada pela AmparaTec Tecnologia Ltda.
              (&quot;AmparaTec&quot;), inscrita no CNPJ sob o nº [CNPJ da AmparaTec], você (&quot;Usuário&quot;) declara que leu,
              compreendeu e concorda integralmente com estes Termos de Uso. Caso não concorde com qualquer disposição,
              não utilize a Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Descrição do Serviço</h2>
            <p>
              A E-CREDac ICMS é uma plataforma digital de intermediação de créditos acumulados de ICMS, conectando
              empresas cedentes (detentoras de créditos) a empresas cessionárias (adquirentes de créditos), com
              funcionalidades de:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>Cadastro e verificação de empresas via CNPJ</li>
              <li>Publicação e busca de ofertas de créditos de ICMS</li>
              <li>Matching inteligente entre cedentes e cessionários</li>
              <li>Acompanhamento de transações e homologação</li>
              <li>Gestão documental e assinatura digital de contratos</li>
              <li>Painel de assessores e comissões</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Cadastro e Conta do Usuário</h2>
            <p>
              3.1. Para utilizar a Plataforma, o Usuário deve criar uma conta fornecendo informações verdadeiras,
              completas e atualizadas, incluindo CNPJ válido e ativo junto à Receita Federal.
            </p>
            <p className="mt-2">
              3.2. O Usuário é responsável pela confidencialidade de suas credenciais de acesso e por todas as
              atividades realizadas em sua conta.
            </p>
            <p className="mt-2">
              3.3. A AmparaTec reserva-se o direito de suspender ou encerrar contas que apresentem irregularidades
              cadastrais, uso indevido ou violação destes Termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Obrigações do Usuário</h2>
            <p>O Usuário compromete-se a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>Fornecer informações verídicas e manter seus dados atualizados</li>
              <li>Utilizar a Plataforma exclusivamente para fins lícitos relacionados à intermediação de créditos de ICMS</li>
              <li>Não tentar burlar mecanismos de segurança ou acessar dados de outros usuários</li>
              <li>Respeitar a legislação tributária aplicável, em especial as normas estaduais sobre transferência de créditos de ICMS</li>
              <li>Manter documentação fiscal e contábil válida e disponível para verificação</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Intermediação de Créditos</h2>
            <p>
              5.1. A AmparaTec atua exclusivamente como intermediadora tecnológica, facilitando o encontro entre
              cedentes e cessionários. A responsabilidade pela veracidade dos créditos, documentação fiscal e
              cumprimento das obrigações tributárias é integralmente dos Usuários envolvidos na transação.
            </p>
            <p className="mt-2">
              5.2. A homologação dos créditos junto à Secretaria da Fazenda do respectivo estado é de
              responsabilidade das partes envolvidas na transação.
            </p>
            <p className="mt-2">
              5.3. A AmparaTec poderá realizar verificações adicionais de segurança, incluindo análise de scoring
              de crédito e validação documental, antes de autorizar transações na Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Taxas e Remuneração</h2>
            <p>
              6.1. A AmparaTec cobrará taxas de intermediação sobre as transações realizadas na Plataforma,
              conforme tabela vigente disponível no painel do Usuário.
            </p>
            <p className="mt-2">
              6.2. As taxas podem ser atualizadas periodicamente, com aviso prévio de 30 (trinta) dias aos Usuários.
            </p>
            <p className="mt-2">
              6.3. Assessores cadastrados receberão comissões conforme as condições acordadas no momento do credenciamento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo da Plataforma, incluindo marca, logotipo, layout, código-fonte, algoritmos de
              matching e scoring, é de propriedade exclusiva da AmparaTec, protegido pela legislação brasileira
              de propriedade intelectual. É proibida a reprodução, distribuição ou utilização sem autorização prévia.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Limitação de Responsabilidade</h2>
            <p>
              8.1. A AmparaTec não se responsabiliza por perdas ou danos decorrentes de: (i) informações incorretas
              fornecidas pelos Usuários; (ii) indisponibilidade temporária da Plataforma; (iii) decisões fiscais
              ou tributárias das autoridades competentes; (iv) inadimplência entre as partes de uma transação.
            </p>
            <p className="mt-2">
              8.2. A Plataforma é fornecida &quot;como está&quot;, sem garantias de que os créditos serão
              homologados ou que as transações serão concluídas com sucesso.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Rescisão</h2>
            <p>
              O Usuário pode encerrar sua conta a qualquer momento. A AmparaTec pode suspender ou encerrar
              o acesso em caso de violação destes Termos, sem prejuízo de eventuais medidas judiciais cabíveis.
              Transações em andamento deverão ser concluídas ou formalmente canceladas antes do encerramento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Disposições Gerais</h2>
            <p>
              10.1. Estes Termos são regidos pela legislação da República Federativa do Brasil.
            </p>
            <p className="mt-2">
              10.2. Fica eleito o foro da Comarca de [cidade-sede da AmparaTec] para dirimir quaisquer controvérsias
              oriundas destes Termos.
            </p>
            <p className="mt-2">
              10.3. A AmparaTec poderá alterar estes Termos a qualquer momento, notificando os Usuários com
              antecedência mínima de 15 (quinze) dias.
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
