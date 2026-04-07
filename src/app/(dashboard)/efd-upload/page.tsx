'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Upload, AlertCircle, CheckCircle2, Clock, Eye, ChevronDown } from 'lucide-react'

interface Upload {
  id: string
  file_name: string
  status: 'parsing' | 'parsed' | 'error'
  created_at: string
  resumo?: {
    total_creditos_pis: number
    total_creditos_cofins: number
    saldo_credor_total: number
    qtd_nfe_entrada: number
    qtd_nfe_saida: number
    periodo: string
  }
  score_verificacao?: {
    score: number
    nivel: 'baixo' | 'medio' | 'alto' | 'verificado'
  }
  error_message?: string
}

export default function EfdUploadPage() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchUploads()
  }, [])

  async function fetchUploads() {
    try {
      const response = await fetch('/api/efd-upload')
      const data = await response.json()
      setUploads(data.uploads || [])
    } catch (error) {
      console.error('Erro ao buscar uploads:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(file: File) {
    if (!file.name.toLowerCase().endsWith(('.txt', '.efd'))) {
      alert('Por favor, envie um arquivo .txt ou .efd')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('Arquivo muito grande (máximo 50MB)')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/efd-upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        alert('EFD enviada com sucesso!')
        fetchUploads()
      } else {
        alert('Erro: ' + (data.error || 'Erro desconhecido'))
      }
    } catch (error) {
      alert('Erro ao enviar arquivo: ' + String(error))
    } finally {
      setUploading(false)
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0])
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'parsed':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
      case 'parsing':
        return 'text-orange-400'
      default:
        return 'text-gray-400'
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'parsed':
        return <CheckCircle2 size={20} />
      case 'error':
        return <AlertCircle size={20} />
      case 'parsing':
        return <Clock size={20} />
      default:
        return null
    }
  }

  function getScoreBadge(score: number) {
    const nivel = score >= 85 ? 'verificado' : score >= 65 ? 'alto' : score >= 40 ? 'medio' : 'baixo'
    const colors = {
      verificado: 'bg-green-900/30 text-green-300 border-green-700',
      alto: 'bg-blue-900/30 text-blue-300 border-blue-700',
      medio: 'bg-yellow-900/30 text-yellow-300 border-yellow-700',
      baixo: 'bg-red-900/30 text-red-300 border-red-700',
    }
    return (
      <span className={`px-2 py-1 rounded border text-xs font-semibold ${colors[nivel]}`}>
        {score}/100 ({nivel})
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload EFD-Contribuições</h1>
          <p className="text-slate-400">Trilho A — Motor de Verificação de Créditos Tributários</p>
        </div>

        {/* Upload Box */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 mb-8 text-center transition-colors ${
            dragActive
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-slate-700 bg-slate-900/50 hover:border-orange-600'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload size={40} className="mx-auto mb-3 text-orange-500" />
          <p className="text-lg font-semibold mb-2">Arraste seu arquivo aqui</p>
          <p className="text-slate-400 mb-4">ou clique para selecionar</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded font-semibold transition"
          >
            {uploading ? 'Enviando...' : 'Selecionar arquivo'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.efd"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            className="hidden"
          />
          <p className="text-xs text-slate-500 mt-4">Formatos aceitos: .txt, .efd (máximo 50MB)</p>
        </div>

        {/* Uploads List */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>Uploads Anteriores</span>
            {uploads.length > 0 && (
              <span className="text-sm font-normal text-slate-400">({uploads.length})</span>
            )}
          </h2>

          {loading ? (
            <div className="text-center py-8 text-slate-400">Carregando...</div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-8 text-slate-400">Nenhum upload realizado ainda</div>
          ) : (
            <div className="space-y-3">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition"
                >
                  {/* Header Row */}
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() =>
                      setExpandedId(expandedId === upload.id ? null : upload.id)
                    }
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={getStatusColor(upload.status)}>
                        {getStatusIcon(upload.status)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{upload.file_name}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(upload.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`text-slate-500 transition-transform ${
                        expandedId === upload.id ? 'rotate-180' : ''
                      }`}
                    />
                  </div>

                  {/* Expanded Details */}
                  {expandedId === upload.id && (
                    <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                      {upload.status === 'error' ? (
                        <div className="bg-red-900/20 border border-red-700 rounded p-3 text-red-300 text-sm">
                          <p className="font-semibold mb-1">Erro ao processar:</p>
                          <p>{upload.error_message}</p>
                        </div>
                      ) : upload.resumo ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-slate-400 uppercase">Período</p>
                              <p className="text-lg font-semibold">{upload.resumo.periodo}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 uppercase">Saldo Credor</p>
                              <p className="text-lg font-semibold text-green-400">
                                R$ {upload.resumo.saldo_credor_total.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            <div className="bg-slate-800/50 rounded p-2">
                              <p className="text-xs text-slate-400">PIS</p>
                              <p className="font-semibold">
                                R${upload.resumo.total_creditos_pis.toFixed(0)}
                              </p>
                            </div>
                            <div className="bg-slate-800/50 rounded p-2">
                              <p className="text-xs text-slate-400">COFINS</p>
                              <p className="font-semibold">
                                R${upload.resumo.total_creditos_cofins.toFixed(0)}
                              </p>
                            </div>
                            <div className="bg-slate-800/50 rounded p-2">
                              <p className="text-xs text-slate-400">NF-e In</p>
                              <p className="font-semibold">{upload.resumo.qtd_nfe_entrada}</p>
                            </div>
                            <div className="bg-slate-800/50 rounded p-2">
                              <p className="text-xs text-slate-400">NF-e Out</p>
                              <p className="font-semibold">{upload.resumo.qtd_nfe_saida}</p>
                            </div>
                          </div>

                          {upload.score_verificacao && (
                            <div className="bg-slate-800/50 rounded p-3">
                              <p className="text-xs text-slate-400 uppercase mb-2">
                                Score de Verificação
                              </p>
                              {getScoreBadge(upload.score_verificacao.score)}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-slate-400 text-sm">Processando...</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
