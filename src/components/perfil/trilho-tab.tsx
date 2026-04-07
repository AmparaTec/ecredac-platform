'use client'

import { useState, useEffect } from 'react'
import { Zap, Building2, Globe, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type TrackPreference = 'federal' | 'estadual' | 'ambos'

const TRACKS = [
  {
    id: 'federal' as TrackPreference,
    label: 'PIS/COFINS Federal',
    badge: 'Trilho A',
    badgeColor: 'bg-brand-600/20 text-brand-400 border-brand-500/30',
    icon: Zap,
    iconColor: 'text-brand-400',
    description: 'Créditos de PIS/COFINS apurados via EFD-Contribuições (SPED). Processo 100% automatizado — faça o upload do arquivo e receba a análise em minutos.',
    features: ['Upload EFD-Contribuições', 'Score de verificação automatizado', 'Cruzamento NF-e com SEFAZ', 'PER/DCOMP assistido'],
    tag: 'Recomendado',
    tagColor: 'bg-emerald-500/20 text-emerald-400',
  },
  {
    id: 'estadual' as TrackPreference,
    label: 'ICMS Estadual',
    badge: 'Trilho B',
    badgeColor: 'bg-slate-600/20 text-slate-500 border-slate-500/30',
    icon: Building2,
    iconColor: 'text-slate-500',
    description: 'Créditos de ICMS acumulados — transferência entre empresas via e-CredAc (SEFAZ-SP) ou similar. Processo assistido com acompanhamento de dossiê.',
    features: ['Dossiê e-CredAc SEFAZ-SP', 'Acompanhamento de protocolo', 'Gestão de procuração eletrônica', 'Pipeline de 8 fases'],
    tag: 'Manual assistido',
    tagColor: 'bg-amber-500/20 text-amber-400',
  },
  {
    id: 'ambos' as TrackPreference,
    label: 'Federal + Estadual',
    badge: 'Dual Track',
    badgeColor: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
    icon: Globe,
    iconColor: 'text-purple-400',
    description: 'Acesse os dois mercados simultaneamente. Ideal para empresas com acúmulo tanto de PIS/COFINS federal quanto de ICMS estadual.',
    features: ['Todos os recursos do Trilho A', 'Todos os recursos do Trilho B', 'Dashboard unificado', 'Score Relius consolidado'],
    tag: 'Máxima abrangência',
    tagColor: 'bg-purple-500/20 text-purple-400',
  },
]

export function TrilhoTab() {
  const [track, setTrack] = useState<TrackPreference>('federal')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) return
        const data = await res.json()
        if (data.company?.track_preference) {
          setTrack(data.company.track_preference as TrackPreference)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function save() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: { track_preference: track } }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Erro ao salvar')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Trilho de Créditos</h2>
        <p className="text-sm text-slate-500">
          Escolha o tipo de crédito tributário que sua empresa deseja negociar na plataforma.
          Esta configuração define quais ferramentas e fluxos estarão disponíveis no seu dashboard.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
        {TRACKS.map((t) => {
          const Icon = t.icon
          const isSelected = track === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTrack(t.id)}
              className={cn(
                'relative text-left p-5 rounded-2xl border-2 transition-all duration-200',
                isSelected
                  ? 'border-brand-500/60 bg-brand-600/10 shadow-lg shadow-brand-500/10'
                  : 'border-dark-500/40 bg-dark-700/50 hover:border-dark-400/60 hover:bg-dark-700'
              )}
            >
              {/* Tag */}
              <span className={cn('absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-medium', t.tagColor)}>
                {t.tag}
              </span>

              {/* Badge */}
              <span className={cn('inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium mb-3', t.badgeColor)}>
                {t.badge}
              </span>

              {/* Icon + Title */}
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('p-2 rounded-xl bg-dark-600', isSelected && 'bg-dark-500')}>
                  <Icon className={cn('w-5 h-5', t.iconColor)} />
                </div>
                <span className="font-semibold text-slate-900 text-sm">{t.label}</span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed mb-4">{t.description}</p>

              <ul className="space-y-1.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-brand-400' : 'text-slate-500')} />
                    {f}
                  </li>
                ))}
              </ul>

              {isSelected && (
                <div className="absolute bottom-3 right-3">
                  <CheckCircle className="w-5 h-5 text-brand-400" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Save bar */}
      <div className="flex justify-end pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar preferência'}
        </button>
      </div>
    </div>
  )
}
