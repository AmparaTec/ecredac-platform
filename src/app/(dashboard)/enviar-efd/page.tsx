'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function EnviarEFD() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [userId, setUserId]     = useState<string | null>(null)
  const [arquivo, setArquivo]   = useState<File | null>(null)
  const [drag, setDrag]         = useState(false)
  const [status, setStatus]     = useState<'idle' | 'enviando' | 'ok' | 'erro'>('idle')
  const [erro, setErro]         = useState('')
  const inputRef                = useRef<HTMLInputElement>(null)

  /* auth guard */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return }
      setUserId(data.user.id)
    })
  }, [])

  /* drag handlers */
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDrag(true)  }
  const onDragLeave = ()                   => setDrag(false)
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) validarEselecionar(f)
  }

  function validarEselecionar(f: File) {
    setErro('')
    if (!f.name.toLowerCase().endsWith('.txt')) {
      setErro('O arquivo deve ser um .txt exportado do SPED Fiscal.')
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      setErro('Arquivo muito grande. Limite: 50 MB.')
      return
    }
    setArquivo(f)
    setStatus('idle')
  }

  async function enviar() {
    if (!arquivo || !userId) return
    setStatus('enviando')
    setErro('')

    const caminho = `${userId}/${Date.now()}_${arquivo.name}`

    const { error } = await supabase.storage
      .from('efd-uploads')
      .upload(caminho, arquivo, { upsert: false })

    if (error) {
      setErro('Falha no envio. Tente novamente.')
      setStatus('erro')
      return
    }

    /* registra na tabela efd_uploads */
    await supabase.from('efd_uploads').insert({
      uploaded_by:     userId,
      storage_path:    caminho,
      file_name:       arquivo.name,
      file_size_bytes: arquivo.size,
      status:          'aguardando_analise',
    })

    setStatus('ok')
  }

  /* ── sucesso ── */
  if (status === 'ok') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Arquivo recebido!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Nossa equipe vai analisar seu EFD em até 48 horas úteis.<br/>
          Você receberá um e-mail com o resultado.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
        >
          Voltar ao painel
        </button>
      </div>
    </div>
  )

  /* ── formulário ── */
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-lg w-full">

        {/* header */}
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1"
        >
          ← Voltar
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">Enviar EFD ICMS</h1>
        <p className="text-gray-500 text-sm mb-8">
          Exporte o arquivo do SPED Fiscal (Bloco C + Bloco H) e envie aqui.
        </p>

        {/* drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`
            border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition
            ${drag
              ? 'border-blue-400 bg-blue-50'
              : arquivo
                ? 'border-green-400 bg-green-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) validarEselecionar(e.target.files[0]) }}
          />

          {arquivo ? (
            <>
              <div className="text-3xl mb-2">📄</div>
              <p className="font-medium text-gray-700 text-sm">{arquivo.name}</p>
              <p className="text-gray-400 text-xs mt-1">
                {(arquivo.size / 1024 / 1024).toFixed(2)} MB — clique para trocar
              </p>
            </>
          ) : (
            <>
              <div className="text-3xl mb-2">📂</div>
              <p className="text-gray-600 text-sm font-medium">
                Arraste o arquivo aqui ou <span className="text-blue-600">clique para selecionar</span>
              </p>
              <p className="text-gray-400 text-xs mt-1">Somente .txt · máx. 50 MB</p>
            </>
          )}
        </div>

        {/* erro */}
        {erro && (
          <p className="mt-3 text-sm text-red-500 text-center">{erro}</p>
        )}

        {/* botão */}
        <button
          onClick={enviar}
          disabled={!arquivo || status === 'enviando'}
          className={`
            mt-6 w-full py-3 rounded-xl font-semibold text-white transition
            ${!arquivo || status === 'enviando'
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
            }
          `}
        >
          {status === 'enviando' ? 'Enviando…' : 'Enviar para análise'}
        </button>

        {/* ajuda */}
        <p className="mt-4 text-xs text-gray-400 text-center">
          Dúvida? Veja como exportar o EFD no{' '}
          <a href="#" className="underline">SPED Fiscal</a>
        </p>

      </div>
    </div>
  )
}
