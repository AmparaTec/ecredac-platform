'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import {
  Settings, Shield, Activity, Users, DollarSign,
  Zap, RefreshCw, AlertTriangle, Database
} from 'lucide-react'

export default function AdminPage() {
  const [stats, setStats] = useState({
    companies: 0,
    listings: 0,
    requests: 0,
    matches: 0,
    transactions: 0,
    totalVolume: 0,
    totalFees: 0,
  })
  const [settings, setSettings] = useState({
    platform_fee_pct: 2,
    max_discount_pct: 25,
    matching_interval: 'hourly',
    auto_matching: true,
  })
  const [recentAudit, setRecentAudit] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAdminData()
  }, [])

  async function loadAdminData() {
    const supabase = createClient()

    const [
      { count: companies },
      { count: listings },
      { count: requests },
      { count: matches },
      { data: txData },
      { data: platformSettings },
      { data: auditLogs },
    ] = await Promise.all([
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('credit_listings').select('*', { count: 'exact', head: true }),
      supabase.from('credit_requests').select('*', { count: 'exact', head: true }),
      supabase.from('matches').select('*', { count: 'exact', head: true }),
      supabase.from('transactions').select('credit_amount, platform_fee'),
      supabase.from('platform_settings').select('*').limit(10),
      supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(20),
    ])

    const totalVolume = txData?.reduce((a, t) => a + (t.credit_amount || 0), 0) || 0
    const totalFees = txData?.reduce((a, t) => a + (t.platform_fee || 0), 0) || 0

    setStats({
      companies: companies || 0,
      listings: listings || 0,
      requests: requests || 0,
      matches: matches || 0,
      transactions: txData?.length || 0,
      totalVolume,
      totalFees,
    })

    // Parse settings from key-value table
    if (platformSettings) {
      const getVal = (key: string) => platformSettings.find((s: any) => s.key === key)?.value
      setSettings({
        platform_fee_pct: Number(getVal('platform_fee_pct')) || 2,
        max_discount_pct: Number(getVal('max_discount_pct')) || 25,
        matching_interval: getVal('matching_interval') || 'hourly',
        auto_matching: getVal('auto_matching') === 'true',
      })
    }

    setRecentAudit(auditLogs || [])
    setLoading(false)
  }

  async function saveSettings() {
    setSaving(true)
    const supabase = createClient()

    const updates = [
      { key: 'platform_fee_pct', value: String(settings.platform_fee_pct) },
      { key: 'max_discount_pct', value: String(settings.max_discount_pct) },
      { key: 'matching_interval', value: settings.matching_interval },
      { key: 'auto_matching', value: String(settings.auto_matching) },
    ]

    for (const u of updates) {
      await supabase
        .from('platform_settings')
        .upsert({ key: u.key, value: u.value }, { onConflict: 'key' })
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Administracao</h1>
          <p className="text-slate-500 mt-1">Painel de controle da plataforma E-CREDac</p>
        </div>
        <Badge variant="premium">Admin</Badge>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-3 text-center">
          <Users size={16} className="mx-auto text-slate-500 mb-1" />
          <p className="text-lg font-bold">{stats.companies}</p>
          <p className="text-[10px] text-slate-500">Empresas</p>
        </Card>
        <Card className="p-3 text-center">
          <DollarSign size={16} className="mx-auto text-slate-500 mb-1" />
          <p className="text-lg font-bold">{stats.listings}</p>
          <p className="text-[10px] text-slate-500">Listings</p>
        </Card>
        <Card className="p-3 text-center">
          <Activity size={16} className="mx-auto text-slate-500 mb-1" />
          <p className="text-lg font-bold">{stats.requests}</p>
          <p className="text-[10px] text-slate-500">Demandas</p>
        </Card>
        <Card className="p-3 text-center">
          <Zap size={16} className="mx-auto text-slate-500 mb-1" />
          <p className="text-lg font-bold">{stats.matches}</p>
          <p className="text-[10px] text-slate-500">Matches</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold">{stats.transactions}</p>
          <p className="text-[10px] text-slate-500">Transações</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-brand-400">{formatBRL(stats.totalVolume)}</p>
          <p className="text-[10px] text-slate-500">Volume</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{formatBRL(stats.totalFees)}</p>
          <p className="text-[10px] text-slate-500">Receita</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} className="text-slate-500" />
            <h2 className="text-lg font-bold text-white">Configurações</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Taxa da Plataforma (%)</label>
              <input
                type="number"
                value={settings.platform_fee_pct}
                onChange={e => setSettings({ ...settings, platform_fee_pct: Number(e.target.value) })}
                min={0} max={10} step={0.1}
                className="w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Desconto Maximo Permitido (%)</label>
              <input
                type="number"
                value={settings.max_discount_pct}
                onChange={e => setSettings({ ...settings, max_discount_pct: Number(e.target.value) })}
                min={0} max={50} step={1}
                className="w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Intervalo do Matching</label>
              <select
                value={settings.matching_interval}
                onChange={e => setSettings({ ...settings, matching_interval: e.target.value })}
                className="w-full rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2.5 text-sm"
              >
                <option value="realtime">Tempo Real</option>
                <option value="hourly">A cada hora</option>
                <option value="daily">Diario</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Auto-Matching</p>
                <p className="text-xs text-slate-500">Executar matching automaticamente</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, auto_matching: !settings.auto_matching })}
                className={`w-12 h-6 rounded-full transition-all ${
                  settings.auto_matching ? 'bg-brand-600' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-all ${
                  settings.auto_matching ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <Button onClick={saveSettings} disabled={saving} className="w-full">
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </Card>

        {/* Audit Log */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-slate-500" />
            <h2 className="text-lg font-bold text-white">Log de Auditoria</h2>
          </div>

          {recentAudit.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentAudit.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-dark-600/30">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    log.action?.includes('create') ? 'bg-emerald-500/20' :
                    log.action?.includes('update') ? 'bg-blue-500/20' :
                    log.action?.includes('delete') ? 'bg-red-500/20' : 'bg-dark-600'
                  }`}>
                    <Database size={10} className={
                      log.action?.includes('create') ? 'text-emerald-400' :
                      log.action?.includes('update') ? 'text-blue-400' :
                      log.action?.includes('delete') ? 'text-red-400' : 'text-slate-500'
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300">{log.action}</p>
                    <p className="text-[10px] text-slate-500">{log.entity_type} · {log.entity_id?.slice(0, 8)}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 flex-shrink-0">
                    {formatDate(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Shield size={24} className="mx-auto mb-2" />
              <p className="text-sm">Nenhum registro de auditoria</p>
            </div>
          )}
        </Card>
      </div>

      {/* System Health */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-slate-500" />
          <h2 className="text-lg font-bold text-white">Saude do Sistema</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/15">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-emerald-400">Supabase</p>
              <p className="text-xs text-emerald-400">Operacional</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/15">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-emerald-400">SEFAZ-SP</p>
              <p className="text-xs text-emerald-400">Conectado</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/15">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-emerald-400">Matching Engine</p>
              <p className="text-xs text-emerald-400">Ativo</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/15">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-emerald-400">Clicksign</p>
              <p className="text-xs text-emerald-400">Integrado</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
