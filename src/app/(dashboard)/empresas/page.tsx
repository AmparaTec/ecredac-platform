'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCNPJ, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, Search, Shield, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    loadCompanies()
  }, [])

  async function loadCompanies() {
    const supabase = createClient()
    let query = supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    const { data } = await query
    setCompanies(data || [])
    setLoading(false)
  }

  const filtered = companies.filter(c => {
    const matchSearch = !search ||
      c.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
      c.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj?.includes(search.replace(/\D/g, ''))
    const matchType = !filterType || c.type === filterType
    return matchSearch && matchType
  })

  const typeLabels: Record<string, string> = {
    seller: 'Cedente',
    buyer: 'Cessionário',
    both: 'Ambos',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Empresas</h1>
        <p className="text-slate-500 mt-1">Diretorio de empresas cadastradas na plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-slate-500">Total Empresas</p>
          <p className="text-2xl font-bold mt-1">{companies.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Cedentes</p>
          <p className="text-2xl font-bold mt-1 text-brand-400">{companies.filter(c => c.type === 'seller' || c.type === 'both').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Cessionários</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{companies.filter(c => c.type === 'buyer' || c.type === 'both').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Premium</p>
          <p className="text-2xl font-bold mt-1 text-amber-400">{companies.filter(c => c.tier === 'premium').length}</p>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, CNPJ..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-dark-500/50 bg-dark-700 text-white text-sm"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="rounded-xl border border-dark-500/50 bg-dark-700 text-white px-4 py-2 text-sm"
          >
            <option value="">Todos os tipos</option>
            <option value="seller">Cedentes</option>
            <option value="buyer">Cessionários</option>
            <option value="both">Ambos</option>
          </select>
        </div>
      </Card>

      {/* Company List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(company => (
            <Card key={company.id} className="p-5" hover>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-300 flex items-center justify-center font-bold text-sm">
                  {(company.nome_fantasia || company.razao_social || 'E').charAt(0)}
                </div>
                <div className="flex gap-1">
                  <Badge variant={company.tier === 'premium' ? 'premium' : 'default'}>
                    {company.tier === 'premium' ? 'Premium' : 'Free'}
                  </Badge>
                </div>
              </div>

              <h3 className="font-bold text-white">{company.nome_fantasia || company.razao_social}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{company.razao_social}</p>
              <p className="text-xs text-slate-500 font-mono mt-1">{formatCNPJ(company.cnpj)}</p>

              <div className="mt-3 pt-3 border-t border-dark-500/40 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tipo</span>
                  <Badge variant="info">{typeLabels[company.type] || company.type}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">SEFAZ</span>
                  <div className="flex items-center gap-1">
                    {company.sefaz_status === 'regular' ? (
                      <CheckCircle2 size={12} className="text-emerald-400" />
                    ) : (
                      <AlertTriangle size={12} className="text-amber-400" />
                    )}
                    <span className={`text-xs font-medium ${
                      company.sefaz_status === 'regular' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {company.sefaz_status === 'regular' ? 'Regular' :
                       company.sefaz_status === 'pending' ? 'Pendente' : company.sefaz_status}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Desde</span>
                  <span className="text-slate-300">{formatDate(company.created_at)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Building2 size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-lg font-medium text-slate-500">Nenhuma empresa encontrada</p>
        </Card>
      )}
    </div>
  )
}
