'use client'

import { Card } from '@/components/ui/card'
import { Building2, Shield, Target, Users, Award, Scale, Zap, Globe } from 'lucide-react'

export default function InstitucionalPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Quem Somos</h1>
        <p className="text-slate-400 mt-1">Conheça a plataforma que está transformando o mercado de créditos de ICMS</p>
      </div>

      {/* Sobre */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
            <Building2 size={20} className="text-brand-400" />
          </div>
          <h2 className="text-lg font-bold text-white">E-CREDac — Motor de Intermediação de Créditos ICMS</h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          O E-CREDac é a maior plataforma de intermediação de créditos acumulados de ICMS do Brasil.
          Desenvolvida pela Rede Ampara Tec, conectamos cedentes (empresas com créditos acumulados na conta corrente do e-CredAc)
          a cessionários (empresas que precisam compensar ICMS), com total conformidade com a legislação paulista
          (RICMS/SP Art. 71-84, Portaria SRE 65/2023).
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">
          Nossa plataforma automatiza todo o fluxo — da originação à liquidação — com scoring inteligente,
          matching por IA, verificação fiscal integrada e acompanhamento completo de SLA.
        </p>
      </Card>

      {/* Missão, Visão, Valores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 space-y-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Target size={18} className="text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-white">Missão</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Democratizar o acesso ao mercado de créditos de ICMS, eliminando assimetrias de informação e
            oferecendo segurança jurídica a todas as partes envolvidas.
          </p>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Globe size={18} className="text-blue-400" />
          </div>
          <h3 className="text-sm font-bold text-white">Visão</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Ser o principal motor de intermediação de créditos tributários do mercado brasileiro,
            expandindo para todos os estados e tributos.
          </p>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <Scale size={18} className="text-purple-400" />
          </div>
          <h3 className="text-sm font-bold text-white">Valores</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Transparência total, compliance regulatório, segurança da informação,
            inovação contínua e compromisso com o cliente.
          </p>
        </Card>
      </div>

      {/* Diferenciais */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Nossos Diferenciais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              icon: Shield,
              color: 'text-emerald-400 bg-emerald-500/15',
              title: 'Compliance Integrado',
              desc: 'Verificação fiscal automática com cruzamento de dados SEFAZ, validação de IE, GIA/EFD e conta corrente e-CredAc.',
            },
            {
              icon: Zap,
              color: 'text-brand-400 bg-brand-500/15',
              title: 'Matching por IA',
              desc: 'Algoritmo inteligente que conecta cedentes e cessionários com base em tipo, valor, deságio e perfil de risco.',
            },
            {
              icon: Award,
              color: 'text-amber-400 bg-amber-500/15',
              title: 'Credit Scoring Proprietário',
              desc: 'Score de A a D avaliando risco SEFAZ, homologação, maturidade, origem, documentação e histórico.',
            },
            {
              icon: Users,
              color: 'text-accent-400 bg-accent-500/15',
              title: 'Rede de Assessores',
              desc: 'Programa de assessores com comissões, ranking e tiers para ampliar o alcance do mercado.',
            },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl bg-dark-600/30">
              <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${item.color}`}>
                <item.icon size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Contato */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-white mb-3">Contato</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="text-slate-400">
              <span className="text-slate-300 font-medium">Empresa:</span> Rede Ampara Tec
            </p>
            <p className="text-slate-400">
              <span className="text-slate-300 font-medium">Plataforma:</span> E-CREDac / RELIUS
            </p>
            <p className="text-slate-400">
              <span className="text-slate-300 font-medium">Email:</span> contato@redeampara.com.br
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-slate-400">
              <span className="text-slate-300 font-medium">Site:</span> relius.com.br
            </p>
            <p className="text-slate-400">
              <span className="text-slate-300 font-medium">Jurisdição:</span> SEFAZ-SP (Art. 71-84 RICMS/SP)
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
