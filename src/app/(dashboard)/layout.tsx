import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { Bell } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get company info
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  const companyName = company?.nome_fantasia || company?.razao_social || 'Empresa'
  const companyTier = company?.tier || 'free'

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar companyName={companyName} companyTier={companyTier} />

      <main className="flex-1 ml-56 min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-20">
          <input
            placeholder="Buscar operacoes, empresas, creditos..."
            className="pl-4 pr-4 py-1.5 w-72 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                {companyName.charAt(0)}
              </div>
              <span className="text-sm font-medium">{companyName}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
