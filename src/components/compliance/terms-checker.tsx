'use client'

import { TermsAcceptanceModal } from './terms-acceptance-modal'

/**
 * Componente leve que monta o modal de termos pendentes.
 * Adicionado no layout do dashboard para verificar automaticamente.
 */
export function TermsChecker() {
  return <TermsAcceptanceModal autoCheck={true} />
}
