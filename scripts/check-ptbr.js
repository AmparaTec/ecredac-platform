#!/usr/bin/env node
/**
 * check-ptbr.js
 * Verifica se há palavras em português sem acento dentro de strings JSX e texto JSX.
 * Roda como pre-commit hook via lint-staged.
 *
 * Uso: node scripts/check-ptbr.js src/app/minha-pagina.tsx
 */

const fs = require('fs');
const path = require('path');

// Mapeamento de palavras erradas → corretas
// Formato: [regex_para_encontrar, substituição_sugerida]
const PTBR_RULES = [
  // Artigos e preposições com acento
  [/\besta operacao\b/gi, 'esta operação'],
  [/\besta opcao\b/gi, 'esta opção'],

  // Palavras mais comuns sem acento (dentro de strings)
  [/\bAnalise\b/g, 'Análise'],
  [/\banalise\b/g, 'análise'],
  [/\bAtuacao\b/g, 'Atuação'],
  [/\batuacao\b/g, 'atuação'],
  [/\bAcao\b/g, 'Ação'],
  [/\bacao\b/g, 'ação'],
  [/\bAtencao\b/g, 'Atenção'],
  [/\batencao\b/g, 'atenção'],
  [/\bAtualizacao\b/g, 'Atualização'],
  [/\batualizacao\b/g, 'atualização'],
  [/\bAutenticacao\b/g, 'Autenticação'],
  [/\bautenticacao\b/g, 'autenticação'],
  [/\bCancelamento\b/g, 'Cancelamento'], // ok, sem acento mesmo
  [/\bCessao\b/g, 'Cessão'],
  [/\bcessao\b/g, 'cessão'],
  [/\bCessionario\b/g, 'Cessionário'],
  [/\bcessionario\b/g, 'cessionário'],
  [/\bCedente\b/g, 'Cedente'], // ok
  [/\bComunicacao\b/g, 'Comunicação'],
  [/\bcomunicacao\b/g, 'comunicação'],
  [/\bConfiguracao\b/g, 'Configuração'],
  [/\bconfiguracao\b/g, 'configuração'],
  [/\bConfirmacao\b/g, 'Confirmação'],
  [/\bconfirmacao\b/g, 'confirmação'],
  [/\bCondicao\b/g, 'Condição'],
  [/\bcondicao\b/g, 'condição'],
  [/\bConexao\b/g, 'Conexão'],
  [/\bconexao\b/g, 'conexão'],
  [/\bConsultoria\b/g, 'Consultoria'], // ok
  [/\bCriacão\b/g, 'Criação'],  // typo com Ã maiúsculo no meio
  [/\bCriacao\b/g, 'Criação'],
  [/\bcriacao\b/g, 'criação'],
  [/\bCredenciacao\b/g, 'Credenciação'],
  [/\bDeclaracao\b/g, 'Declaração'],
  [/\bdeclaracao\b/g, 'declaração'],
  [/\bDescricao\b/g, 'Descrição'],
  [/\bdescricao\b/g, 'descrição'],
  [/\bDocumentacao\b/g, 'Documentação'],
  [/\bdocumentacao\b/g, 'documentação'],
  [/\bEdicao\b/g, 'Edição'],
  [/\bedicao\b/g, 'edição'],
  [/\bEmissao\b/g, 'Emissão'],
  [/\bemissao\b/g, 'emissão'],
  [/\bEspecificacao\b/g, 'Especificação'],
  [/\bExclusao\b/g, 'Exclusão'],
  [/\bexclusao\b/g, 'exclusão'],
  [/\bExportacao\b/g, 'Exportação'],
  [/\bexportacao\b/g, 'exportação'],
  [/\bFuncao\b/g, 'Função'],
  [/\bfuncao\b/g, 'função'],
  [/\bGeracao\b/g, 'Geração'],
  [/\bgeracao\b/g, 'geração'],
  [/\bGestao\b/g, 'Gestão'],
  [/\bgestao\b/g, 'gestão'],
  [/\bHomologacao\b/g, 'Homologação'],
  [/\bhomologacao\b/g, 'homologação'],
  [/\bImportacao\b/g, 'Importação'],
  [/\bimportacao\b/g, 'importação'],
  [/\bIndicacao\b/g, 'Indicação'],
  [/\bindicacao\b/g, 'indicação'],
  [/\bInformacao\b/g, 'Informação'],
  [/\binformacao\b/g, 'informação'],
  [/\bIntegracao\b/g, 'Integração'],
  [/\bintegracao\b/g, 'integração'],
  [/\bInvalido\b/g, 'Inválido'],
  [/\binvalido\b/g, 'inválido'],
  [/\bLocalizacao\b/g, 'Localização'],
  [/\bMediacao\b/g, 'Mediação'],
  [/\bMedia\b/g, 'Média'],  // cuidado: pode ser HTML <Media>, tratar no contexto
  [/\bNegociacao\b/g, 'Negociação'],
  [/\bnegociacao\b/g, 'negociação'],
  [/\bNotificacao\b/g, 'Notificação'],
  [/\bnotificacao\b/g, 'notificação'],
  [/\bOperacao\b/g, 'Operação'],
  [/\boperacao\b/g, 'operação'],
  [/\bOpcao\b/g, 'Opção'],
  [/\bopcao\b/g, 'opção'],
  [/\bPagamento\b/g, 'Pagamento'], // ok
  [/\bPolitica\b/g, 'Política'],
  [/\bpolitica\b/g, 'política'],
  [/\bposicao\b/g, 'posição'],
  [/\bPosicao\b/g, 'Posição'],
  [/\bProporcao\b/g, 'Proporção'],
  [/\bProducao\b/g, 'Produção'],
  [/\bproducao\b/g, 'produção'],
  [/\bProprietario\b/g, 'Proprietário'],
  [/\bproprietario\b/g, 'proprietário'],
  [/\bProtecao\b/g, 'Proteção'],
  [/\bprotecao\b/g, 'proteção'],
  [/\bRazao\b/g, 'Razão'],
  [/\brazao\b/g, 'razão'],
  [/\bRedacao\b/g, 'Redação'],
  [/\bReducao\b/g, 'Redução'],
  [/\breducao\b/g, 'redução'],
  [/\bRegistracao\b/g, 'Registração'],
  [/\bRelacao\b/g, 'Relação'],
  [/\brelacao\b/g, 'relação'],
  [/\bSessao\b/g, 'Sessão'],
  [/\bsessao\b/g, 'sessão'],
  [/\bSocio\b/g, 'Sócio'],
  [/\bsocio\b/g, 'sócio'],
  [/\bSolicitacao\b/g, 'Solicitação'],
  [/\bsolicitacao\b/g, 'solicitação'],
  [/\bSubstituicao\b/g, 'Substituição'],
  [/\bTransacao\b/g, 'Transação'],
  [/\btransacao\b/g, 'transação'],
  [/\bTransferencia\b/g, 'Transferência'],
  [/\btransferencia\b/g, 'transferência'],
  [/\bTributario\b/g, 'Tributário'],
  [/\btributario\b/g, 'tributário'],
  [/\bTributacao\b/g, 'Tributação'],
  [/\btributacao\b/g, 'tributação'],
  [/\bUnico\b/g, 'Único'],
  [/\bunico\b/g, 'único'],
  [/\bValidacao\b/g, 'Validação'],
  [/\bvalidacao\b/g, 'validação'],
  [/\bVisualizacao\b/g, 'Visualização'],
  [/\bvisualizacao\b/g, 'visualização'],
  [/\bAliquota\b/g, 'Alíquota'],
  [/\baliquota\b/g, 'alíquota'],
  [/\bEscritorio\b/g, 'Escritório'],
  [/\bescritorio\b/g, 'escritório'],
];

// Extrai apenas conteúdo de strings JSX e texto JSX (não identifiers de código)
// Captura: "...", '...', `...`, e texto entre tags JSX (>texto<)
const STRING_PATTERNS = [
  /"([^"\\]|\\.)*"/g,      // strings duplas
  /'([^'\\]|\\.)*'/g,      // strings simples
  /`([^`\\]|\\.)*`/g,      // template literals
  />([^<>{}\n]+)</g,        // texto JSX entre tags
];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, lineIndex) => {
    // Pula comentários
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    // Pula linhas de import/export/const (identificadores de código)
    if (/^\s*(import|export|const|let|var|function|interface|type|enum)\s/.test(line)) {
      // Mas ainda verifica strings dentro delas
    }

    PTBR_RULES.forEach(([pattern, suggestion]) => {
      // Só aplica dentro de contextos de string ou JSX text
      let inStringContext = false;
      STRING_PATTERNS.forEach(strPattern => {
        strPattern.lastIndex = 0;
        let match;
        while ((match = strPattern.exec(line)) !== null) {
          const str = match[0];
          const testPattern = new RegExp(pattern.source, 'gi');
          if (testPattern.test(str)) {
            inStringContext = true;
          }
        }
      });

      if (inStringContext) {
        const testPattern = new RegExp(pattern.source, 'gi');
        let match;
        while ((match = testPattern.exec(line)) !== null) {
          issues.push({
            file: filePath,
            line: lineIndex + 1,
            col: match.index + 1,
            found: match[0],
            suggestion,
          });
        }
      }
    });
  });

  return issues;
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Uso: node scripts/check-ptbr.js <arquivo1.tsx> [arquivo2.tsx ...]');
  process.exit(0);
}

let totalIssues = 0;

args.forEach(file => {
  if (!fs.existsSync(file)) return;
  const ext = path.extname(file);
  if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return;

  const issues = checkFile(file);
  if (issues.length > 0) {
    issues.forEach(issue => {
      console.error(`❌ ${issue.file}:${issue.line}:${issue.col} — "${issue.found}" → use "${issue.suggestion}"`);
    });
    totalIssues += issues.length;
  }
});

if (totalIssues > 0) {
  console.error(`\n⛔ ${totalIssues} problema(s) de PT-BR encontrado(s). Corrija antes de commitar.`);
  console.error('   Dica: rode o script scripts/fix-ptbr.py para corrigir automaticamente.\n');
  process.exit(1);
} else {
  console.log('✅ PT-BR OK — nenhum problema de acentuação encontrado.');
  process.exit(0);
}
