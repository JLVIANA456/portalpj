// MAPEAMENTO MANUAL CURADO: SERVICOS MAIS COMUNS NO BRASIL (LC 116 -> NBS)
// Mapeamento expandido com suporte a codigos individuais e lookup por prefixo de grupo.

export interface MapeamentoNbsCurado {
    termoComum: string;
    lc116: string;
    nbs: string;
    descricaoNbs: string;
}

// Mapeamento individual por codigo LC 116 exato
export const MAPEAMENTO_CURADO_SERVICOS: MapeamentoNbsCurado[] = [
    // 1. Tecnologia da Informacao (grupo 01)
    { termoComum: 'Analise e desenvolvimento de sistemas', lc116: '010101', nbs: '1.1502.10.00', descricaoNbs: 'Servicos de projeto, desenvolvimento e instalacao de aplicativos e programas nao personalizados' },
    { termoComum: 'Programacao', lc116: '010201', nbs: '1.1502.20.00', descricaoNbs: 'Servicos de projeto e desenvolvimento, adaptacao e instalacao de aplicativos e programas personalizados' },
    { termoComum: 'Processamento de dados / Hospedagem', lc116: '010301', nbs: '1.1506.21.00', descricaoNbs: 'Servicos de hospedagem de aplicativos e programas software como servico (SaaS)' },
    { termoComum: 'Armazenamento ou hospedagem de dados', lc116: '010302', nbs: '1.1506.21.00', descricaoNbs: 'Servicos de hospedagem de dados e armazenamento em nuvem' },
    { termoComum: 'Elaboracao de programas de computadores', lc116: '010401', nbs: '1.1502.20.00', descricaoNbs: 'Servicos de elaboracao de programas de computadores e jogos eletronicos' },
    { termoComum: 'Licenciamento de software', lc116: '010501', nbs: '1.1502.10.00', descricaoNbs: 'Servicos de licenciamento e cessao de direito de uso de programas de computacao' },
    { termoComum: 'Assessoria e consultoria em informatica', lc116: '010601', nbs: '1.1401.19.00', descricaoNbs: 'Servicos de assessoria e consultoria em informatica' },
    { termoComum: 'Suporte tecnico em informatica', lc116: '010701', nbs: '1.1501.30.00', descricaoNbs: 'Servicos de suporte em tecnologia da informacao (TI)' },
    { termoComum: 'Paginas eletronicas / Web', lc116: '010801', nbs: '1.1502.20.00', descricaoNbs: 'Servicos de planejamento, confeccao, manutencao e atualizacao de paginas eletronicas' },

    // 2. Pesquisa e Desenvolvimento (grupo 02)
    { termoComum: 'Pesquisa e desenvolvimento', lc116: '020101', nbs: '1.1101.10.00', descricaoNbs: 'Servicos de pesquisa e desenvolvimento experimental' },

    // 3. Contabilidade e Financas (grupo 17)
    { termoComum: 'Contabilidade', lc116: '171901', nbs: '1.1302.21.00', descricaoNbs: 'Servicos de contabilidade' },
    { termoComum: 'Folha de pagamento / Departamento Pessoal', lc116: '170201', nbs: '1.1302.23.00', descricaoNbs: 'Servicos de folha de pagamento' },
    { termoComum: 'Assessoria tributaria (Pessoa Juridica)', lc116: '170101', nbs: '1.1303.10.00', descricaoNbs: 'Servicos de consultoria tributaria para pessoas juridicas' },
    { termoComum: 'Auditoria contabil', lc116: '171801', nbs: '1.1302.11.00', descricaoNbs: 'Servicos de auditoria contabil' },
    { termoComum: 'Consultoria empresarial / gestao', lc116: '171701', nbs: '1.1401.19.00', descricaoNbs: 'Servicos de consultoria em gestao empresarial' },
    { termoComum: 'Corretagem de seguros', lc116: '170501', nbs: '1.1303.30.00', descricaoNbs: 'Servicos de corretagem de seguros' },
    { termoComum: 'Administracao de fundos e carteiras', lc116: '170401', nbs: '1.1303.20.00', descricaoNbs: 'Servicos de administracao de fundos e carteiras' },
    { termoComum: 'Cobranca e recuperacao de creditos', lc116: '170301', nbs: '1.1303.90.00', descricaoNbs: 'Servicos de cobranca e recuperacao de creditos' },
    { termoComum: 'Publicidade e marketing', lc116: '170601', nbs: '1.1402.10.00', descricaoNbs: 'Servicos de planejamento e criacao de campanhas publicitarias' },

    // 4. Advocacia e Servicos Juridicos (grupo 17)
    { termoComum: 'Advocacia / Representacao Juridica', lc116: '171401', nbs: '1.1301.20.00', descricaoNbs: 'Servicos de representacao e consultoria juridica' },
    { termoComum: 'Mediacao e Arbitragem', lc116: '171501', nbs: '1.1301.40.00', descricaoNbs: 'Servicos de arbitragem, conciliacao e mediacao' },

    // 5. Medicina e Saude (grupo 04)
    { termoComum: 'Medicina (Clinica Geral)', lc116: '040101', nbs: '1.2301.21.00', descricaoNbs: 'Servicos de clinica medica' },
    { termoComum: 'Biomedicina', lc116: '040102', nbs: '1.2301.21.00', descricaoNbs: 'Servicos de biomedicina' },
    { termoComum: 'Analises clinicas / Patologia', lc116: '040201', nbs: '1.2301.92.00', descricaoNbs: 'Servicos de analises clinicas e patologia' },
    { termoComum: 'Hospitais e clinicas', lc116: '040301', nbs: '1.2301.11.00', descricaoNbs: 'Servicos hospitalares' },
    { termoComum: 'Odontologia', lc116: '041201', nbs: '1.2301.23.00', descricaoNbs: 'Servicos odontologicos' },
    { termoComum: 'Fisioterapia', lc116: '040802', nbs: '1.2301.92.00', descricaoNbs: 'Servicos de fisioterapia' },
    { termoComum: 'Psicologia / Psiquiatria', lc116: '040901', nbs: '1.2301.13.00', descricaoNbs: 'Servicos psiquiatricos e psicologicos' },
    { termoComum: 'Enfermagem', lc116: '040601', nbs: '1.2301.92.00', descricaoNbs: 'Servicos de enfermagem' },

    // 6. Engenharia e Arquitetura (grupo 07)
    { termoComum: 'Engenharia / Projetos', lc116: '070101', nbs: '1.1202.10.00', descricaoNbs: 'Servicos de consultoria e projeto de engenharia' },
    { termoComum: 'Arquitetura', lc116: '070201', nbs: '1.1201.10.00', descricaoNbs: 'Servicos de consultoria e projeto de arquitetura' },
    { termoComum: 'Gestao de obras', lc116: '070301', nbs: '1.1202.20.00', descricaoNbs: 'Servicos de gerenciamento de obras' },

    // 7. Educacao e Treinamento (grupo 08)
    { termoComum: 'Ensino e educacao', lc116: '080101', nbs: '1.2205.19.00', descricaoNbs: 'Servicos de ensino e educacao' },
    { termoComum: 'Treinamento e capacitacao', lc116: '080201', nbs: '1.2205.19.00', descricaoNbs: 'Servicos de educacao, inclusive treinamento e capacitacao' }
];

// Mapeamento de fallback por PREFIXO de grupo (primeiros 2 digitos do LC 116)
export const MAPEAMENTO_GRUPO_PREFIXO: Record<string, string> = {
    '01': '1.1502.20.00',  // TI e computacao -> software personalizado
    '02': '1.1101.10.00',  // Pesquisa e desenvolvimento
    '03': '1.1401.19.00',  // Locacao e cessao de direitos
    '04': '1.2301.21.00',  // Saude -> clinica medica
    '05': '1.2301.23.00',  // Medicina veterinaria
    '06': '1.2206.10.00',  // Cuidados pessoais e estetica
    '07': '1.1202.10.00',  // Engenharia e arquitetura
    '08': '1.2205.19.00',  // Educacao e treinamento
    '09': '1.1403.10.00',  // Hospedagem e turismo
    '10': '1.1404.10.00',  // Transporte
    '11': '1.1404.20.00',  // Transporte aereo
    '12': '1.2201.10.00',  // Arte e cultura
    '13': '1.2201.10.00',  // Comunicacao
    '14': '1.0401.10.00',  // Servicos bancarios
    '15': '1.2301.92.00',  // Saude complementar
    '16': '1.1601.10.00',  // Servicos urbanos e limpeza
    '17': '1.1302.21.00',  // Contabilidade e servicos financeiros
    '18': '1.1302.21.00',  // Servicos de apoio empresarial
    '19': '1.1601.10.00',  // Servicos ambientais
    '20': '1.1401.19.00',  // Consultoria e assessoria
    '21': '1.1601.10.00',  // Servicos de manutencao
    '22': '1.1202.10.00',  // Construcao civil
    '23': '1.1601.10.00',  // Outros servicos
};

/**
 * Retorna o NBS exato pelo codigo LC 116.
 * Se nao encontrar, tenta pelo prefixo de 2 digitos (grupo de servico).
 */
export function getNbsCorrelato(lc116Codigo: string): string {
    // Busca exata
    const mapeamento = MAPEAMENTO_CURADO_SERVICOS.find(item => item.lc116 === lc116Codigo);
    if (mapeamento) return mapeamento.nbs;

    // Fallback por grupo (primeiros 2 digitos)
    const prefixo = lc116Codigo.slice(0, 2);
    return MAPEAMENTO_GRUPO_PREFIXO[prefixo] ?? '';
}

export function getDescricaoNbsCorrelata(lc116Codigo: string): string {
    const mapeamento = MAPEAMENTO_CURADO_SERVICOS.find(item => item.lc116 === lc116Codigo);
    return mapeamento ? mapeamento.descricaoNbs : '';
}
