// ==================== CONFIGURAÇÃO DA API ====================
// Detectar ambiente automaticamente
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://merfin-server.onrender.com';

console.log('🌐 API URL configurada:', API_URL);
// ============================================================

let categoriesReceitas = new Set();
let categoriesDespesas = new Set();
let chatStarted = false;
let tempUserData = null; // Dados temporários do cadastro

window.userId = null; // Será definido após login
window.currentConversationId = null; // ID da conversa atual
let profileNotificationTimer = null; // Timer para notificações de perfil

// Função para detectar se está em dispositivo móvel
function isMobile() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Função para mostrar modal de disclaimer para mobile
function showMobileDisclaimerModal() {
    // Verificar se já existe
    if (document.getElementById('mobile-disclaimer-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'mobile-disclaimer-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: var(--spacing-xl);
        max-width: 400px;
        width: 90%;
        text-align: center;
        position: relative;
        box-shadow: var(--shadow-lg);
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: var(--spacing-sm);
        right: var(--spacing-sm);
        background: none;
        border: none;
        font-size: 24px;
        color: var(--color-text-secondary);
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    closeBtn.onmouseout = () => closeBtn.style.background = 'none';
    closeBtn.onclick = () => modal.remove();

    const message = document.createElement('p');
    message.style.cssText = `
        margin: 0;
        color: var(--color-text-primary);
        font-size: 15px;
        line-height: 1.5;
    `;
    message.innerHTML = '<strong>📱 Aviso:</strong> Em breve estaremos lançando nosso app para smartphone, mas por enquanto a plataforma é feita para usar somente em telas maiores como notebook, tablet e computador.';

    content.appendChild(closeBtn);
    content.appendChild(message);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

function startNewChat() {
    document.getElementById('chat-messages').innerHTML = '';
    chatStarted = false;
    window.currentConversationId = null;
    document.querySelector('.finance-prompt').style.display = 'block';
}

// Função para efeito de máquina de escrever
function typeWriter(element, text, speed, callback) {
    let i = 0;
    element.textContent = '';
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            if (callback) callback();
        }
    }
    type();
}

// Função para obter cor baseada no nome da categoria (para gráficos)
const categoryColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
    '#F1948A', '#85C1E9', '#D7BDE2', '#AED6F1', '#A3E4D7'
];

let categoryColorMapForCharts = new Map();

function getCategoryColor(category) {
    if (categoryColorMapForCharts.has(category)) {
        return categoryColorMapForCharts.get(category);
    } else {
        const hash = category.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const color = categoryColors[hash % categoryColors.length];
        categoryColorMapForCharts.set(category, color);
        return color;
    }
}

// Cores disponíveis para categorias e subcategorias
const colorPalette = {
    azulado: {
        background: 'rgba(30, 90, 150, 0.13)',
        color: 'rgb(100, 156, 212)',
        border: 'rgba(100, 150, 200, 0.214)'
    },
    avermelhado: {
        background: 'rgba(150, 50, 50, 0.13)',
        color: 'rgb(212, 120, 120)',
        border: 'rgba(200, 100, 100, 0.214)'
    },
    dourado: {
        background: 'rgba(130, 110, 40, 0.13)',
        color: 'rgb(200, 180, 100)',
        border: 'rgba(180, 160, 80, 0.214)'
    },
    verde: {
        background: 'rgba(40, 120, 90, 0.13)',
        color: 'rgb(100, 200, 160)',
        border: 'rgba(80, 180, 140, 0.214)'
    },
    rosado: {
        background: 'rgba(100, 50, 90, 0.13)',
        color: 'rgb(190, 130, 170)',
        border: 'rgba(170, 100, 150, 0.214)'
    },
    roxo: {
        background: 'rgba(80, 60, 150, 0.13)',
        color: 'rgb(160, 140, 220)',
        border: 'rgba(130, 110, 200, 0.214)'
    },
    laranja: {
        background: 'rgba(220, 120, 40, 0.13)',
        color: 'rgb(255, 170, 90)',
        border: 'rgba(240, 140, 60, 0.214)'
    },
    turquesa: {
        background: 'rgba(40, 180, 180, 0.13)',
        color: 'rgb(100, 240, 240)',
        border: 'rgba(80, 210, 210, 0.214)'
    },
    fucsia: {
        background: 'rgba(180, 60, 160, 0.13)',
        color: 'rgb(240, 120, 220)',
        border: 'rgba(210, 90, 190, 0.214)'
    },
    cereja: {
        background: 'rgba(180, 40, 80, 0.13)',
        color: 'rgb(240, 100, 140)',
        border: 'rgba(210, 70, 110, 0.214)'
    },
    menta: {
        background: 'rgba(60, 200, 140, 0.13)',
        color: 'rgb(120, 255, 200)',
        border: 'rgba(90, 230, 170, 0.214)'
    },
    lavanda: {
        background: 'rgba(150, 120, 200, 0.13)',
        color: 'rgb(200, 170, 240)',
        border: 'rgba(180, 150, 220, 0.214)'
    }
};

// Mapeamento de cores para categorias (cada categoria tem uma cor única)
const categoryColorMap = {
    receitas: {
        'Salário e Rendimentos do Trabalho': 'dourado',
        'Renda de Empreendimentos': 'verde',
        'Renda de Aluguéis': 'azulado',
        'Investimentos': 'roxo',
        'Juros e Rendimentos Financeiros': 'turquesa',
        'Presentes, Doações e Heranças': 'rosado',
        'Venda de Bens e Ativos': 'laranja'
    },
    despesas: {
        'Moradia': 'azulado',
        'Transporte': 'turquesa',
        'Alimentação': 'laranja',
        'Saúde': 'avermelhado',
        'Educação': 'dourado',
        'Lazer e Entretenimento': 'fucsia',
        'Vestuário e Cuidados Pessoais': 'rosado',
        'Seguros e Proteção': 'roxo',
        'Serviços Financeiros': 'verde',
        'Tecnologia e Comunicação': 'cereja',
        'Filhos e Dependentes': 'menta',
        'Impostos e Obrigações Legais': 'avermelhado',
        'Serviços Domésticos': 'lavanda',
        'Compras e Consumo': 'dourado',
        'Outros': 'azulado'
    }
};

// Mapeamento de cores para subcategorias (cores diferentes dentro de cada categoria, mas podem repetir entre categorias diferentes)
const subcategoryColorMap = {
    receitas: {
        'Salário e Rendimentos do Trabalho': {
            'Salário fixo': 'verde',
            'Horas extras': 'azulado',
            'Bônus e comissões': 'roxo',
            'Férias recebidas': 'turquesa',
            'Participação nos lucros': 'rosado',
            'Vale-refeição': 'laranja',
            'Trabalho autônomo': 'menta',
            'Freelance': 'lavanda',
            'Diárias e gratificações': 'fucsia'
        },
        'Renda de Empreendimentos': {
            'Lucro de empresa própria': 'dourado',
            'Distribuição de lucros': 'azulado',
            'Venda de produtos': 'roxo',
            'Prestação de serviços': 'turquesa'
        },
        'Renda de Aluguéis': {
            'Aluguel de imóvel residencial': 'verde',
            'Aluguel de imóvel comercial': 'dourado',
            'Aluguel por temporada (Airbnb)': 'roxo'
        },
        'Investimentos': {
            'Dividendos de ações': 'verde',
            'Juros sobre capital próprio': 'azulado',
            'Rendimentos de fundos imobiliários': 'dourado',
            'Ganhos com venda de ações': 'turquesa',
            'Renda de CDBs e RDBs': 'laranja',
            'Renda de Tesouro Direto': 'menta',
            'Renda de criptomoedas': 'fucsia',
            'Renda de ETFs': 'rosado',
            'Renda de debêntures': 'cereja',
            'Renda de previdência privada': 'lavanda'
        },
        'Juros e Rendimentos Financeiros': {
            'Juros de poupança': 'verde',
            'Juros de aplicações bancárias': 'azulado',
            'Juros de empréstimos concedidos': 'dourado',
            'Juros de títulos públicos': 'roxo',
            'Juros de contas remuneradas': 'laranja',
            'Juros de consórcios': 'menta'
        },
        'Presentes, Doações e Heranças': {
            'Presentes em dinheiro': 'verde',
            'Doações familiares': 'azulado',
            'Herança recebida': 'dourado',
            'Transferência de bens': 'turquesa',
            'Doações de amigos': 'roxo',
            'Presentes de casamento': 'laranja',
            'Presentes de aniversário': 'menta',
            'Prêmios em sorteios': 'fucsia'
        },
        'Venda de Bens e Ativos': {
            'Venda de carro': 'verde',
            'Venda de imóvel': 'azulado',
            'Venda de eletrônicos': 'turquesa',
            'Venda de móveis': 'roxo',
            'Venda de roupas': 'rosado',
            'Venda de joias': 'dourado',
            'Venda de obras de arte': 'fucsia',
            'Venda de instrumentos musicais': 'menta',
            'Venda de equipamentos': 'cereja',
            'Venda de itens colecionáveis': 'lavanda'
        }
    },
    despesas: {
        'Moradia': {
            'Aluguel': 'verde',
            'Financiamento imobiliário': 'dourado',
            'Condomínio': 'roxo',
            'Energia elétrica': 'turquesa',
            'Água e esgoto': 'menta',
            'Gás encanado ou botijão': 'laranja',
            'Internet residencial': 'rosado',
            'Manutenção e reparos': 'fucsia',
            'Móveis e decoração': 'lavanda',
            'Produtos de limpeza': 'cereja'
        },
        'Transporte': {
            'Combustível': 'verde',
            'Manutenção do veículo': 'azulado',
            'Seguro do carro': 'dourado',
            'IPVA e licenciamento': 'roxo',
            'Estacionamento': 'laranja',
            'Transporte público': 'menta',
            'Aplicativos de transporte (Uber, 99)': 'rosado',
            'Pedágios': 'fucsia',
            'Lavagem e estética automotiva': 'cereja',
            'Financiamento de veículo': 'lavanda'
        },
        'Alimentação': {
            'Supermercado': 'verde',
            'Restaurantes': 'azulado',
            'Delivery': 'turquesa',
            'Lanches e cafés': 'dourado',
            'Refeições no trabalho': 'roxo',
            'Bebidas alcoólicas': 'rosado',
            'Suplementos alimentares': 'menta'
        },
        'Saúde': {
            'Plano de saúde': 'verde',
            'Medicamentos': 'dourado',
            'Consultas médicas': 'azulado',
            'Exames laboratoriais': 'turquesa',
            'Terapias (fisioterapia, psicologia)': 'roxo',
            'Odontologia': 'laranja',
            'Óculos e lentes': 'menta',
            'Academia e atividades físicas': 'rosado'
        },
        'Educação': {
            'Mensalidade escolar/universitária': 'verde',
            'Cursos de idiomas': 'azulado',
            'Cursos profissionalizantes': 'roxo',
            'Material escolar': 'turquesa',
            'Livros e e-books': 'laranja',
            'Plataformas de ensino online': 'menta',
            'Transporte escolar': 'rosado',
            'Uniformes': 'fucsia',
            'Aulas particulares': 'cereja',
            'Inscrição em provas e concursos': 'lavanda'
        },
        'Lazer e Entretenimento': {
            'Cinema e teatro': 'verde',
            'Assinaturas de streaming': 'azulado',
            'Viagens e turismo': 'dourado',
            'Passeios e eventos': 'turquesa',
            'Hobbies (instrumentos, artesanato)': 'roxo',
            'Jogos e videogames': 'laranja',
            'Parques e atrações': 'menta',
            'Festas e comemorações': 'rosado',
            'Clube ou associação recreativa': 'cereja',
            'Livros de entretenimento': 'lavanda'
        },
        'Vestuário e Cuidados Pessoais': {
            'Roupas': 'verde',
            'Calçados': 'azulado',
            'Acessórios (bolsas, cintos)': 'dourado',
            'Salão de beleza': 'turquesa',
            'Barbearia': 'roxo',
            'Cosméticos': 'laranja',
            'Perfumes': 'fucsia',
            'Cuidados com a pele': 'menta'
        },
        'Seguros e Proteção': {
            'Seguro de vida': 'verde',
            'Seguro residencial': 'azulado',
            'Seguro automotivo': 'dourado',
            'Seguro viagem': 'turquesa',
            'Seguro saúde complementar': 'laranja',
            'Seguro de equipamentos eletrônicos': 'menta',
            'Seguro de acidentes pessoais': 'rosado',
            'Seguro para pets': 'fucsia',
            'Assistência 24h': 'cereja',
            'Planos de proteção digital': 'lavanda'
        },
        'Serviços Financeiros': {
            'Tarifas bancárias': 'azulado',
            'Anuidade de cartão de crédito': 'dourado',
            'Consultoria financeira': 'roxo',
            'Contabilidade': 'turquesa',
            'Investimentos (ações, fundos)': 'laranja',
            'Previdência privada': 'rosado',
            'Taxas de corretagem': 'menta',
            'Juros e encargos': 'fucsia',
            'Empréstimos e financiamentos': 'cereja',
            'Aplicativos de controle financeiro': 'lavanda'
        },
        'Tecnologia e Comunicação': {
            'Celular (aparelho)': 'verde',
            'Plano de celular': 'azulado',
            'Internet residencial': 'dourado',
            'Assinaturas de apps': 'turquesa',
            'Softwares e licenças': 'roxo',
            'Equipamentos eletrônicos': 'laranja',
            'Manutenção de eletrônicos': 'rosado',
            'Acessórios (fones, cabos)': 'menta',
            'Serviços de nuvem': 'fucsia'
        },
        'Filhos e Dependentes': {
            'Creche': 'verde',
            'Escola': 'azulado',
            'Roupas infantis': 'dourado',
            'Brinquedos': 'turquesa',
            'Fraldas e higiene': 'roxo',
            'Alimentação infantil': 'laranja',
            'Atividades extracurriculares': 'rosado',
            'Mesada': 'fucsia',
            'Transporte escolar': 'cereja'
        },
        'Impostos e Obrigações Legais': {
            'Imposto de Renda': 'verde',
            'IPVA': 'azulado',
            'IPTU': 'dourado',
            'Taxas municipais': 'turquesa',
            'Contribuições sindicais': 'roxo',
            'Multas de trânsito': 'laranja',
            'Taxas de cartório': 'rosado',
            'Custas judiciais': 'menta',
            'Contribuições previdenciárias': 'fucsia',
            'Parcelamentos de débitos': 'cereja'
        },
        'Serviços Domésticos': {
            'Faxina': 'verde',
            'Lavanderia': 'azulado',
            'Jardinagem': 'dourado',
            'Piscineiro': 'turquesa',
            'Diarista': 'roxo',
            'Babá': 'laranja',
            'Cuidador de idosos': 'rosado',
            'Reparos elétricos': 'menta',
            'Reparos hidráulicos': 'fucsia',
            'Instalações e montagens': 'cereja'
        },
        'Compras e Consumo': {
            'Eletrodomésticos': 'verde',
            'Eletrônicos': 'azulado',
            'Móveis': 'turquesa',
            'Utensílios domésticos': 'roxo',
            'Artigos de papelaria': 'laranja',
            'Itens de decoração': 'rosado',
            'Ferramentas': 'menta',
            'Produtos de pet shop': 'fucsia',
            'Compras online': 'cereja',
            'Produtos sazonais (Natal, Páscoa)': 'lavanda'
        },
        'Outros': {
            'Presentes': 'verde',
            'Doações': 'dourado',
            'Gorjetas': 'turquesa',
            'Multas e penalidades': 'roxo',
            'Compras por impulso': 'laranja',
            'Gastos com animais de estimação': 'rosado',
            'Despesas judiciais': 'menta',
            'Taxas de cartório': 'fucsia'
        }
    }
};

const subcategoriesMap = {
    receitas: {
        'Salário e Rendimentos do Trabalho': [
            'Salário fixo', 'Horas extras', 'Bônus e comissões', 'Férias recebidas', 'Participação nos lucros',
            'Vale-refeição', 'Trabalho autônomo', 'Freelance', 'Diárias e gratificações'
        ],
        'Renda de Empreendimentos': [
            'Lucro de empresa própria', 'Distribuição de lucros', 'Venda de produtos', 'Prestação de serviços'
        ],
        'Renda de Aluguéis': [
            'Aluguel de imóvel residencial', 'Aluguel de imóvel comercial', 'Aluguel por temporada (Airbnb)'
        ],
        'Investimentos': [
            'Dividendos de ações', 'Juros sobre capital próprio', 'Rendimentos de fundos imobiliários',
            'Ganhos com venda de ações', 'Renda de CDBs e RDBs', 'Renda de Tesouro Direto',
            'Renda de criptomoedas', 'Renda de ETFs', 'Renda de debêntures', 'Renda de previdência privada'
        ],
        'Juros e Rendimentos Financeiros': [
            'Juros de poupança', 'Juros de aplicações bancárias', 'Juros de empréstimos concedidos',
            'Juros de títulos públicos', 'Juros de contas remuneradas', 'Juros de consórcios'
        ],
        'Presentes, Doações e Heranças': [
            'Presentes em dinheiro', 'Doações familiares', 'Herança recebida', 'Transferência de bens',
            'Doações de amigos', 'Presentes de casamento', 'Presentes de aniversário', 'Prêmios em sorteios'
        ],
        'Venda de Bens e Ativos': [
            'Venda de carro', 'Venda de imóvel', 'Venda de eletrônicos', 'Venda de móveis',
            'Venda de roupas', 'Venda de joias', 'Venda de obras de arte', 'Venda de instrumentos musicais',
            'Venda de equipamentos', 'Venda de itens colecionáveis'
        ]
    },
    despesas: {
        'Moradia': [
            'Aluguel', 'Financiamento imobiliário', 'Condomínio', 'Energia elétrica', 'Água e esgoto',
            'Gás encanado ou botijão', 'Internet residencial', 'Manutenção e reparos', 'Móveis e decoração',
            'Produtos de limpeza'
        ],
        'Transporte': [
            'Combustível', 'Manutenção do veículo', 'Seguro do carro', 'IPVA e licenciamento',
            'Estacionamento', 'Transporte público', 'Aplicativos de transporte (Uber, 99)', 'Pedágios',
            'Lavagem e estética automotiva', 'Financiamento de veículo'
        ],
        'Alimentação': [
            'Supermercado', 'Restaurantes', 'Delivery', 'Lanches e cafés', 'Refeições no trabalho',
            'Bebidas alcoólicas', 'Suplementos alimentares'
        ],
        'Saúde': [
            'Plano de saúde', 'Medicamentos', 'Consultas médicas', 'Exames laboratoriais',
            'Terapias (fisioterapia, psicologia)', 'Odontologia', 'Óculos e lentes', 'Academia e atividades físicas'
        ],
        'Educação': [
            'Mensalidade escolar/universitária', 'Cursos de idiomas', 'Cursos profissionalizantes',
            'Material escolar', 'Livros e e-books', 'Plataformas de ensino online', 'Transporte escolar',
            'Uniformes', 'Aulas particulares', 'Inscrição em provas e concursos'
        ],
        'Lazer e Entretenimento': [
            'Cinema e teatro', 'Assinaturas de streaming', 'Viagens e turismo', 'Passeios e eventos',
            'Hobbies (instrumentos, artesanato)', 'Jogos e videogames', 'Parques e atrações',
            'Festas e comemorações', 'Clube ou associação recreativa', 'Livros de entretenimento'
        ],
        'Vestuário e Cuidados Pessoais': [
            'Roupas', 'Calçados', 'Acessórios (bolsas, cintos)', 'Salão de beleza', 'Barbearia',
            'Cosméticos', 'Perfumes', 'Cuidados com a pele'
        ],
        'Seguros e Proteção': [
            'Seguro de vida', 'Seguro residencial', 'Seguro automotivo', 'Seguro viagem',
            'Seguro saúde complementar', 'Seguro de equipamentos eletrônicos', 'Seguro de acidentes pessoais',
            'Seguro para pets', 'Assistência 24h', 'Planos de proteção digital'
        ],
        'Serviços Financeiros': [
            'Tarifas bancárias', 'Anuidade de cartão de crédito', 'Consultoria financeira', 'Contabilidade',
            'Investimentos (ações, fundos)', 'Previdência privada', 'Taxas de corretagem', 'Juros e encargos',
            'Empréstimos e financiamentos', 'Aplicativos de controle financeiro'
        ],
        'Tecnologia e Comunicação': [
            'Celular (aparelho)', 'Plano de celular', 'Internet residencial', 'Assinaturas de apps',
            'Softwares e licenças', 'Equipamentos eletrônicos', 'Manutenção de eletrônicos',
            'Acessórios (fones, cabos)', 'Serviços de nuvem'
        ],
        'Filhos e Dependentes': [
            'Creche', 'Escola', 'Roupas infantis', 'Brinquedos', 'Fraldas e higiene',
            'Alimentação infantil', 'Atividades extracurriculares', 'Mesada', 'Transporte escolar'
        ],
        'Impostos e Obrigações Legais': [
            'Imposto de Renda', 'IPVA', 'IPTU', 'Taxas municipais', 'Contribuições sindicais',
            'Multas de trânsito', 'Taxas de cartório', 'Custas judiciais', 'Contribuições previdenciárias',
            'Parcelamentos de débitos'
        ],
        'Serviços Domésticos': [
            'Faxina', 'Lavanderia', 'Jardinagem', 'Piscineiro', 'Diarista', 'Babá',
            'Cuidador de idosos', 'Reparos elétricos', 'Reparos hidráulicos', 'Instalações e montagens'
        ],
        'Compras e Consumo': [
            'Eletrodomésticos', 'Eletrônicos', 'Móveis', 'Utensílios domésticos', 'Artigos de papelaria',
            'Itens de decoração', 'Ferramentas', 'Produtos de pet shop', 'Compras online', 'Produtos sazonais (Natal, Páscoa)'
        ],
        'Outros': [
            'Presentes', 'Doações', 'Gorjetas', 'Multas e penalidades', 'Compras por impulso',
            'Gastos com animais de estimação', 'Despesas judiciais', 'Taxas de cartório'
        ]
    }
};

// Função para aplicar estilo de cor a um select
function applyCategoryColor(select, category, type) {
    const colorName = categoryColorMap[type]?.[category];
    if (colorName && colorPalette[colorName]) {
        const colors = colorPalette[colorName];
        select.style.background = colors.background;
        select.style.color = colors.color;
        select.style.border = `1px solid ${colors.border}`;
    } else {
        // Cor padrão se não encontrar mapeamento
        select.style.background = 'var(--color-background)';
        select.style.color = 'var(--color-text-primary)';
        select.style.border = '1px solid var(--color-border)';
    }
}

function applySubcategoryColor(select, category, subcategory, type) {
    const colorName = subcategoryColorMap[type]?.[category]?.[subcategory];
    if (colorName && colorPalette[colorName]) {
        const colors = colorPalette[colorName];
        select.style.background = colors.background;
        select.style.color = colors.color;
        select.style.border = `1px solid ${colors.border}`;
    } else {
        // Cor padrão se não encontrar mapeamento
        select.style.background = 'var(--color-background)';
        select.style.color = 'var(--color-text-primary)';
        select.style.border = '1px solid var(--color-border)';
    }
}

// Atualizar createCategorySelect para usar as categorias principais
function createCategorySelect(type) {
    const select = document.createElement('select');
    select.className = 'category-select';
    select.style.width = '100%';
    select.style.padding = 'var(--spacing-xs)';
    select.style.borderRadius = 'var(--radius-sm)';

    // Adicionar opção vazia
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = 'Selecione uma categoria';
    select.appendChild(emptyOpt);

    // Adicionar categorias principais
    Object.keys(subcategoriesMap[type]).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });

    // Aplicar cor inicial (vazia)
    select.style.background = 'var(--color-background)';
    select.style.color = 'var(--color-text-primary)';
    select.style.border = '1px solid var(--color-border)';

    // Listener para mudar cor quando selecionar
    select.addEventListener('change', function() {
        if (this.value) {
            applyCategoryColor(this, this.value, type);
        } else {
            this.style.background = 'var(--color-background)';
            this.style.color = 'var(--color-text-primary)';
            this.style.border = '1px solid var(--color-border)';
        }
    });

    return select;
}

async function processWithAI(description, tableType) {
    console.log('🔵 [processWithAI] Iniciando processamento');
    console.log('📝 Descrição:', description);
    console.log('📊 Tipo de tabela:', tableType);
    
    const type = tableType.startsWith('receitas') ? 'receitas' : 'despesas';
    const categories = Object.keys(subcategoriesMap[type]);
    console.log('📁 Tipo:', type);
    console.log('🗂️ Categorias disponíveis:', categories);

    try {
        // Etapa 1: Identificar todas as categorias
        console.log('🔄 Etapa 1: Identificando categoria...');
        const categoryResponse = await fetch(`${API_URL}/process-category`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description, categories, userId: window.userId })
        });
        const categoryData = await categoryResponse.json();
        const category = categoryData.category;
        console.log('✅ Categoria identificada:', category);

        // Etapa 2: Processar múltiplas transações
        const subcategories = subcategoriesMap[type][category] || [];
        const isReceita = type === 'receitas';
        console.log('🔄 Etapa 2: Processando subcategorias...');
        console.log('🏷️ Subcategorias disponíveis:', subcategories);
        console.log('💰 É receita?', isReceita);
        
        const subcategoryResponse = await fetch(`${API_URL}/process-subcategory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description, category, subcategories, userId: window.userId, isReceita })
        });
        const result = await subcategoryResponse.json();
        console.log('📦 Resposta da IA (raw):', result);

        // Retornar array (pode ter 1 ou mais transações)
        const finalResult = Array.isArray(result) ? result : [result];
        console.log('✅ Resultado final (array):', finalResult);
        return finalResult;
    } catch (error) {
        console.error('❌ [processWithAI] Erro:', error);
        throw error;
    }
}

// Função para abrir modal de IA
function openModal() {
    const modal = document.getElementById('ai-modal');
    if (!modal) return;

    modal.style.display = 'block';

    // Resetar estados e textos para passo 1
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    modalTitle.textContent = 'Selecione a Planilha';
    modalDesc.textContent = 'Escolha em qual tabela você deseja adicionar a transação para que a IA possa processar corretamente.';
    const tableSelect = document.getElementById('table-select');
    const inputSection = document.getElementById('input-section');
    tableSelect.style.display = 'block';
    tableSelect.style.opacity = '1';
    inputSection.style.display = 'none';
    inputSection.style.opacity = '0';
    tableSelect.value = '';
    document.getElementById('ai-description').value = '';
    document.getElementById('ai-loading').style.display = 'none';

    // Event listener para o select
    tableSelect.addEventListener('change', () => {
        const selected = tableSelect.value;
        if (selected) {
            // Mudar textos para passo 2
            modalTitle.textContent = 'Faça seus lançamentos';
            modalDesc.textContent = 'Digite uma descrição simples. A IA vai preencher automaticamente.';
            // Fade out do select
            tableSelect.style.opacity = '0';
            setTimeout(() => {
                tableSelect.style.display = 'none';
                // Fade in do input
                inputSection.style.display = 'block';
                setTimeout(() => {
                    inputSection.style.opacity = '1';
                    document.getElementById('ai-description').focus();
                }, 10);
            }, 300);
        }
    });

    // Função para formatar valor como moeda
    function formatCurrencyValue(value) {
        const num = parseFloat(value);
        if (isNaN(num)) return '';
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // Event listeners para botões
    document.getElementById('close-modal').onclick = () => {
        modal.style.display = 'none';
    };

    // Adicionar event listener para ai-submit apenas se não foi adicionado ainda
    if (!modal.aiSubmitListenerAdded) {
        document.getElementById('ai-submit').addEventListener('click', async () => {
            const tableType = tableSelect.value;
            const description = document.getElementById('ai-description').value.trim();
            console.log('🚀 [ai-submit] Botão clicado');
            console.log('📊 Tabela selecionada:', tableType);
            console.log('📝 Descrição:', description);
            
            if (!tableType || !description) return alert('Selecione a tabela e digite uma descrição.');

            document.getElementById('ai-loading').style.display = 'block';
            try {
                console.log('⏳ Processando com IA...');
                const results = await processWithAI(description, tableType); // Agora retorna array
                console.log('✅ Resultados recebidos:', results);
                
                // Iterar sobre cada transação e criar linha
                console.log(`📝 Criando ${results.length} linha(s)...`);
                results.forEach((result, index) => {
                    console.log(`📄 Preenchendo linha ${index + 1}:`, result);
                    fillRowWithAI(null, tableType, result);
                });
                
                console.log('✅ Todas as linhas criadas com sucesso!');
                modal.style.display = 'none';
            } catch (error) {
                console.error('❌ [ai-submit] Erro completo:', error);
                alert('Erro ao processar com IA. Tente novamente.');
            } finally {
                document.getElementById('ai-loading').style.display = 'none';
            }
        });
        modal.aiSubmitListenerAdded = true;
    }
}
}

// Função para fechar o modal de IA
function closeAiModal() {
    const modal = document.getElementById('ai-modal');
    if (modal) {
        modal.style.display = 'none';
        // Resetar estados
        document.getElementById('table-select').value = '';
        document.getElementById('ai-description').value = '';
        document.getElementById('table-select').style.display = 'block';
        document.getElementById('input-section').style.display = 'none';
    }
}

// Função para preencher linha com dados da IA
function fillRowWithAI(row, tableType, data) {
    console.log('🖊️ [fillRowWithAI] Iniciando preenchimento');
    console.log('📊 Tabela:', tableType);
    console.log('📦 Dados recebidos:', data);
    
    // Encontrar linha vazia ou usar a fornecida
    let targetRow = row; // row passada como parâmetro (se aplicável)
    if (!targetRow) {
        const tbody = document.getElementById(`${tableType}-table`).querySelector('tbody');
        const isReceita = tableType.startsWith('receitas');
        console.log('🔍 Procurando linha vazia...');
        
        // Procurar linha vazia usando critérios específicos:
        // 1. Descrição vazia (coluna 2)
        // 2. Categoria com valor "Selecione uma categoria" (coluna 4 para receitas, coluna 3 para despesas)
        for (let i = 0; i < tbody.rows.length; i++) {
            const r = tbody.rows[i];
            const descricaoInput = r.cells[2].querySelector('input');
            const categoriaSelect = isReceita ? r.cells[4].querySelector('select') : r.cells[3].querySelector('select');
            
            const descricaoVazia = descricaoInput && descricaoInput.value.trim() === '';
            const categoriaPadrao = categoriaSelect && categoriaSelect.value === 'Selecione uma categoria';
            
            console.log(`📋 Linha ${i}: Descrição vazia? ${descricaoVazia}, Categoria padrão? ${categoriaPadrao}`);
            
            if (descricaoVazia && categoriaPadrao) {
                targetRow = r;
                console.log(`✅ Linha vazia encontrada no índice ${i}`);
                break;
            }
        }
        // Se não encontrou linha vazia, adicionar nova
        if (!targetRow) {
            console.log('➕ Nenhuma linha vazia, adicionando nova...');
            addRow(tableType);
            targetRow = tbody.rows[tbody.rows.length - 1];
        }
    }

    const cells = targetRow.cells;
    const isReceita = tableType.startsWith('receitas');
    console.log('💰 É receita?', isReceita);
    console.log('📋 Total de células:', cells.length);
    
    try {
        // Preencher data e criar timestamp
        console.log('📅 Preenchendo data:', data.data);
        const dateInput = cells[0].querySelector('input');
        dateInput.value = data.data;
        
        // Criar timestamp com hora, minuto e segundo atuais
        const [year, month, day] = data.data.split('-');
        const now = new Date();
        const timestamp = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
        dateInput.setAttribute('data-timestamp', timestamp);
        console.log('⏰ Timestamp criado:', timestamp);
        
        // Preencher status (coluna 1)
        console.log('🔖 Preenchendo status:', data.status || '(vazio)');
        console.log('🔍 Status select encontrado:', cells[1].querySelector('select') !== null);
        const statusSelect = cells[1].querySelector('select');
        if (data.status) {
            console.log('✅ Setando status para:', data.status);
            statusSelect.value = data.status;
            console.log('✅ Status setado. Valor atual:', statusSelect.value);
        } else {
            console.log('⚠️ Nenhum status fornecido pela IA');
        }
        
        // Preencher descrição (coluna 2)
        console.log('📝 Preenchendo descrição:', data.descricao);
        cells[2].querySelector('input').value = data.descricao;
        
        // Preencher valor (coluna 3 para receitas, coluna 5 para despesas)
        const valorCell = isReceita ? cells[3] : cells[5];
        console.log(`💵 Preenchendo valor na coluna ${isReceita ? 3 : 5}:`, data.valor);
        valorCell.querySelector('input').value = formatCurrencyValue(data.valor);
        
        // Preencher categoria
        const catSelect = isReceita ? cells[4].querySelector('select') : cells[3].querySelector('select');
        console.log(`🗂️ Preenchendo categoria na coluna ${isReceita ? 4 : 3}:`, data.category);
        catSelect.value = data.category;
        
        // Preencher subcategoria
        const subSelect = isReceita ? cells[5].querySelector('select') : cells[4].querySelector('select');
        console.log(`🏷️ Preenchendo subcategoria na coluna ${isReceita ? 5 : 4}:`, data.subcategory);
        subSelect.innerHTML = '';
        const subs = subcategoriesMap[isReceita ? 'receitas' : 'despesas'][data.category] || [];
        console.log('🏷️ Subcategorias disponíveis:', subs);
        subs.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.textContent = sub;
            subSelect.appendChild(opt);
        });
        subSelect.value = data.subcategory;
        
        // Preencher notas (coluna 6 para receitas, coluna 7 para despesas)
        const notasCell = isReceita ? cells[6] : cells[7];
        console.log(`📋 Preenchendo notas na coluna ${isReceita ? 6 : 7}:`, data.notas || '(vazio)');
        if (notasCell && notasCell.querySelector('input')) {
            notasCell.querySelector('input').value = data.notas || '';
        }
        
        // Para despesas, preencher método de pagamento (coluna 6)
        if (!isReceita && data.metodo) {
            const metodoCell = cells[6];
            console.log('💳 Preenchendo método na coluna 6:', data.metodo);
            if (metodoCell && metodoCell.querySelector('select')) {
                metodoCell.querySelector('select').value = data.metodo;
            }
        }
        
        console.log('✅ Preenchimento concluído com sucesso!');
        
        // Salvar transação
        console.log('💾 Salvando transação...');
        saveTransaction(tableType, targetRow);
        updateDashboard();
        console.log('✅ Transação salva e dashboard atualizado!');
    } catch (error) {
        console.error('❌ [fillRowWithAI] Erro durante preenchimento:', error);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Nova função para criar select de subcategoria
function createSubcategorySelect(category, type) {
    const select = document.createElement('select');
    select.className = 'subcategory-select';
    select.style.width = '100%';
    select.style.padding = 'var(--spacing-xs)';
    select.style.borderRadius = 'var(--radius-sm)';

    // Adicionar opção vazia
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = 'Selecione uma subcategoria';
    select.appendChild(emptyOpt);

    // Adicionar subcategorias se categoria estiver definida
    if (category && subcategoriesMap[type][category]) {
        subcategoriesMap[type][category].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.textContent = sub;
            select.appendChild(opt);
        });
    }

    // Aplicar cor inicial (vazia)
    select.style.background = 'var(--color-background)';
    select.style.color = 'var(--color-text-primary)';
    select.style.border = '1px solid var(--color-border)';

    // Listener para mudar cor quando selecionar
    select.addEventListener('change', function() {
        if (this.value && category) {
            applySubcategoryColor(this, category, this.value, type);
        } else {
            this.style.background = 'var(--color-background)';
            this.style.color = 'var(--color-text-primary)';
            this.style.border = '1px solid var(--color-border)';
        }
    });

    return select;
}

// Função para coletar categorias de receitas
function collectCategoriesReceitas() {
    categoriesReceitas.clear();
    const receitaTags = document.querySelectorAll('#receitas-table .category-tag');
    receitaTags.forEach(tag => {
        if (tag.style.display !== 'none' && tag.textContent.trim()) {
            categoriesReceitas.add(tag.textContent.trim());
        }
    });
}

// Função para coletar categorias de despesas
function collectCategoriesDespesas() {
    categoriesDespesas.clear();
    const despesaTags = document.querySelectorAll('#despesas-table .category-tag');
    despesaTags.forEach(tag => {
        if (tag.style.display !== 'none' && tag.textContent.trim()) {
            categoriesDespesas.add(tag.textContent.trim());
        }
    });
}



// Função para atualizar dropdown com categorias do tipo
function updateDropdown(dropdown, type) {
    dropdown.innerHTML = '';
    const cats = type === 'receitas' ? categoriesReceitas : categoriesDespesas;
    cats.forEach(cat => {
        const li = document.createElement('li');
        li.textContent = cat;
        dropdown.appendChild(li);
    });
}

// Função para desformatar moeda (R$ 1.000,00 -> 1000.00)
function parseCurrency(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/[^\d,]/g, '').replace(',', '.'));
}

document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o usuário está logado
    window.userId = sessionStorage.getItem('userId');
    const loginTimestamp = sessionStorage.getItem('loginTimestamp');
    
    // Verificar se passou 24 horas desde o login
    if (window.userId && loginTimestamp) {
        const now = new Date().getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
        
        if (now - parseInt(loginTimestamp) > twentyFourHours) {
            // Logout automático após 24 horas
            sessionStorage.removeItem('userId');
            sessionStorage.removeItem('loginTimestamp');
            window.userId = null;
            showLoginModal();
            return;
        }
    }
    
    if (!window.userId) {
        showLoginModal();
        return; // Não continuar carregando a página até login
    }

    // Iniciar sistema de notificações de perfil
    startProfileNotificationSystem();

    // Mostrar disclaimer para dispositivos móveis após login
    if (isMobile()) {
        setTimeout(() => {
            showMobileDisclaimerModal();
        }, 2000); // Pequeno delay para aparecer após carregamento
    }

    // Continuar com o código existente se logado
    const input = document.getElementById('message-input');
    const prompt = document.querySelector('.finance-prompt');

    // Mostrar prompt inicialmente
    prompt.style.display = 'block';

    // Esconder/mostrar prompt ao digitar, apenas se o chat não foi iniciado
    input.addEventListener('input', () => {
        if (!chatStarted) {
            if (input.value.trim() !== '') {
                prompt.style.display = 'none';
            } else {
                prompt.style.display = 'block';
            }
        }
    });

    // Filtros de tabela
    document.querySelectorAll('.filter-icon').forEach(icon => {
        icon.addEventListener('click', () => {
            const tableId = icon.dataset.table;
            const columnId = icon.dataset.column;
            const select = document.querySelector(`.filter-select[data-table="${tableId}"][data-column="${columnId}"]`);
            select.style.display = select.style.display === 'none' ? 'inline-block' : 'none';
        });
    });

    document.querySelectorAll('.filter-select').forEach(select => {
        select.addEventListener('change', () => {
            const tableId = select.dataset.table;
            const criteria = select.value;
            sortTable(tableId, criteria);
            select.style.display = 'none'; // Esconder após seleção
        });
    });

    // Aplicar filtro padrão (Mais Recente) ao carregar
    const tables = ['receitas-recorrentes-table', 'receitas-variaveis-table', 'despesas-fixas-table', 'despesas-variaveis-table'];
    tables.forEach(tableId => {
        sortTable(tableId, 'date-desc');
    });

    // Habilitar scroll horizontal arrastando com botão esquerdo do mouse nas planilhas
    let isDragging = false;
    let startX;
    let scrollLeft;

    document.querySelectorAll('.spreadsheet-group').forEach(group => {
        group.style.cursor = 'grab'; // Cursor inicial

        group.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.pageX - group.offsetLeft;
            scrollLeft = group.scrollLeft;
            group.style.cursor = 'grabbing';
        });

        group.addEventListener('mouseleave', () => {
            isDragging = false;
            group.style.cursor = 'grab';
        });

        group.addEventListener('mouseup', () => {
            isDragging = false;
            group.style.cursor = 'grab';
        });

        group.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - group.offsetLeft;
            const walk = (x - startX) * 2; // Multiplicador para velocidade
            group.scrollLeft = scrollLeft - walk;
        });
    });
});

// Função para mostrar modal de login/cadastro
function showLoginModal() {
    const modal = document.getElementById('login-modal');
    modal.style.display = 'flex'; // Mostrar o modal

    // Iniciar efeito de máquina de escrever após 1 segundo
    setTimeout(() => {
        const titleElement = document.getElementById('welcome-title');
        const subtitleElement = document.getElementById('welcome-subtitle');
        
        // Efeito no título: ~1 segundo para "Bem vindo ao Merfin" (aumento adicional de 20%)
        typeWriter(titleElement, 'Bem vindo ao Merfin', 58, () => {
            // Após título, colorir "Merfin"
            titleElement.innerHTML = titleElement.textContent.replace('Merfin', '<span style="color: rgb(200, 180, 100);">Merfin</span>');
            
            // Efeito no subtítulo: ~0.9 segundos (aumento adicional de 25%)
            typeWriter(subtitleElement, 'Organize sua vida financeira e\nalcance seus objetivos com o Merfin', 23, null);
        });
    }, 1000);

    // Estado inicial: login
    let isRegisterMode = false;

    // Evento para login
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Limpar mensagens anteriores
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = '';
        messageDiv.innerHTML = '';
        
        if (isRegisterMode) {
            // Modo cadastro: validar e mostrar card do plano
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const nome = document.getElementById('modal-nome').value.trim();
            const nascimento = document.getElementById('modal-nascimento').value.trim();
            const contato = document.getElementById('modal-contato').value.trim();
            
            // Validar campos obrigatórios manualmente
            if (!email) {
                messageDiv.textContent = 'O email é obrigatório';
                messageDiv.style.color = '#ff6b6b';
                document.getElementById('email').focus();
                return;
            }
            if (!password) {
                messageDiv.textContent = 'A senha é obrigatória';
                messageDiv.style.color = '#ff6b6b';
                document.getElementById('password').focus();
                return;
            }
            if (!nome) {
                messageDiv.textContent = 'O nome é obrigatório';
                messageDiv.style.color = '#ff6b6b';
                document.getElementById('modal-nome').focus();
                return;
            }
            if (!nascimento) {
                messageDiv.textContent = 'A data de nascimento é obrigatória';
                messageDiv.style.color = '#ff6b6b';
                document.getElementById('modal-nascimento').focus();
                return;
            }
            if (!contato) {
                messageDiv.textContent = 'O contato é obrigatório';
                messageDiv.style.color = '#ff6b6b';
                document.getElementById('modal-contato').focus();
                return;
            }
            
            // Armazenar dados temporários
            tempUserData = { email, password, nome, nascimento, contato };
            
            // Esconder formulário e mostrar card do plano
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('plan-card').style.display = 'block';
            document.getElementById('modal-title').textContent = 'Escolha seu Plano';
        } else {
            // Modo login
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            
            if (!email || !password) {
                messageDiv.textContent = 'Email e senha são obrigatórios';
                messageDiv.style.color = '#ff6b6b';
                return;
            }
            
            await loginUser(email, password);
        }
    });

    // Evento para alternar para modo cadastro
    document.getElementById('register-btn').addEventListener('click', () => {
        isRegisterMode = true;
        document.getElementById('modal-title').textContent = 'Cadastro Completo';
        document.getElementById('extra-fields').style.display = 'block';
        document.getElementById('submit-btn').textContent = 'Cadastrar';
        document.getElementById('register-btn').style.display = 'none';
        document.getElementById('login-btn').style.display = 'inline-block'; // Mostrar botão voltar
    });

    // Evento para voltar ao login
    document.getElementById('login-btn').addEventListener('click', () => {
        isRegisterMode = false;
        document.getElementById('modal-title').textContent = 'Login ou Cadastro';
        document.getElementById('extra-fields').style.display = 'none';
        document.getElementById('submit-btn').textContent = 'Entrar';
        document.getElementById('register-btn').style.display = 'inline-block';
        document.getElementById('login-btn').style.display = 'none'; // Ocultar botão voltar
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('plan-card').style.display = 'none';
        tempUserData = null;
    });

    // Evento para finalizar cadastro e ir para pagamento
    document.getElementById('finalize-payment-btn').addEventListener('click', async () => {
        if (tempUserData) {
            const { email, password, nome, nascimento, contato } = tempUserData;
            await registerUser(email, password, { nome, nascimento, contato });
        }
    });

    // Evento para voltar do card do plano para o formulário
    document.getElementById('back-to-form-btn').addEventListener('click', () => {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('plan-card').style.display = 'none';
        document.getElementById('modal-title').textContent = 'Cadastro Completo';
    });
}

// Função para login
async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        
        if (response.ok) {
            // Login bem-sucedido - status ativo ou ativo_pendente
            window.userId = data.userId;
            sessionStorage.setItem('userId', window.userId);
            sessionStorage.setItem('loginTimestamp', new Date().getTime().toString()); // Salvar timestamp de login
            document.getElementById('login-modal').style.display = 'none';
            // Resetar contador de notificações no novo login
            sessionStorage.removeItem('profileNotificationCount');
            sessionStorage.removeItem('lastProfileNotification');
            location.reload();
        } else if (response.status === 403) {
            // Acesso bloqueado por status
            const messageDiv = document.getElementById('message');
            messageDiv.style.color = '#ff6b6b';
            
            if (data.status === 'pendente_pagamento') {
                // Exibir notificação de pagamento pendente com botão WhatsApp
                messageDiv.innerHTML = `
                    <div style="padding: var(--spacing-md); background: rgba(255, 107, 107, 0.1); border: 1px solid rgba(255, 107, 107, 0.3); border-radius: var(--radius-sm); margin-top: var(--spacing-md);">
                        <strong style="display: block; margin-bottom: var(--spacing-xs);">⚠️ Acesso Bloqueado</strong>
                        <p style="margin: 0 0 var(--spacing-md) 0; font-size: 14px;">${data.notification}</p>
                        <a href="https://api.whatsapp.com/send/?phone=5511915381876&text&type=phone_number&app_absent=0" 
                           target="_blank" 
                           style="display: inline-block; padding: var(--spacing-sm) var(--spacing-md); background: rgb(200, 180, 100); color: #000; text-decoration: none; border-radius: var(--radius-sm); font-weight: 600; transition: all 0.2s;">
                            💬 Fale Conosco
                        </a>
                    </div>
                `;
            } else if (data.status === 'cancelado') {
                // Exibir mensagem de assinatura cancelada com botão WhatsApp
                messageDiv.innerHTML = `
                    <div style="padding: var(--spacing-md); background: rgba(255, 107, 107, 0.1); border: 1px solid rgba(255, 107, 107, 0.3); border-radius: var(--radius-sm); margin-top: var(--spacing-md);">
                        <strong style="display: block; margin-bottom: var(--spacing-xs);">🚫 Assinatura Cancelada</strong>
                        <p style="margin: 0 0 var(--spacing-md) 0; font-size: 14px;">${data.notification}</p>
                        <a href="https://api.whatsapp.com/send/?phone=5511915381876&text&type=phone_number&app_absent=0" 
                           target="_blank" 
                           style="display: inline-block; padding: var(--spacing-sm) var(--spacing-md); background: rgb(200, 180, 100); color: #000; text-decoration: none; border-radius: var(--radius-sm); font-weight: 600; transition: all 0.2s;">
                            💬 Fale Conosco
                        </a>
                    </div>
                `;
            }
        } else {
            // Erro genérico (credenciais inválidas, etc)
            document.getElementById('message').textContent = data.message;
            document.getElementById('message').style.color = '#ff6b6b';
        }
    } catch (error) {
        document.getElementById('message').textContent = 'Erro ao fazer login';
        document.getElementById('message').style.color = '#ff6b6b';
    }
}

// Função para cadastro
async function registerUser(email, password, extraData) {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, ...extraData })
        });
        const data = await response.json();
        if (response.ok) {
            // Cadastro bem-sucedido - redirecionar para pagamento
            window.location.href = 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=653c3e69168f44e997e4e25f1f3f500d';
        } else {
            // Voltar para formulário em caso de erro
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('plan-card').style.display = 'none';
            document.getElementById('modal-title').textContent = 'Cadastro Completo';
            document.getElementById('message').textContent = data.message;
            document.getElementById('message').style.color = '#ff6b6b';
        }
    } catch (error) {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('plan-card').style.display = 'none';
        document.getElementById('message').textContent = 'Erro ao cadastrar';
        document.getElementById('message').style.color = '#ff6b6b';
    }
}

function logout() {
    // Parar timer de notificações
    if (profileNotificationTimer) {
        clearInterval(profileNotificationTimer);
        profileNotificationTimer = null;
    }
    // Remover userId e loginTimestamp do sessionStorage para "sair"
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('loginTimestamp');
    sessionStorage.removeItem('profileNotificationCount');
    sessionStorage.removeItem('lastProfileNotification');
    window.userId = null;
    // Recarregar a página para mostrar o modal de login
    location.reload();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

function showPage(pageId) {
    const pages = document.querySelectorAll('.page-section');
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    // Controlar visibilidade do botão flutuante
    const floatBtn = document.getElementById('ai-float-btn');
    if (floatBtn) {
        if (pageId === 'financas') {
            // Esconder na página Finanças (já tem chat integrado)
            floatBtn.style.display = 'none';
        } else {
            // Mostrar nas outras páginas
            floatBtn.style.display = 'flex';
        }
    }
    
    if (pageId === 'minhas-financas') {
        initializeFinances();
    }
    if (pageId === 'financas') {
        updateCompactDashboard();
    }
    if (pageId === 'perfil') {
        loadProfile();
    }
}

function showSubPage(subPageId) {
    const subPages = document.querySelectorAll('.subpage');
    subPages.forEach(page => page.classList.remove('active'));
    document.getElementById(subPageId).classList.add('active');
    const btns = document.querySelectorAll('.subpage-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Controlar visibilidade do botão acumulado
    const accumulatedBtn = document.getElementById('accumulated-btn');
    if (accumulatedBtn) {
        if (subPageId === 'dashboard-content') {
            accumulatedBtn.style.display = 'inline-block';
        } else {
            accumulatedBtn.style.display = 'none';
            // Resetar modo acumulado ao sair do dashboard
            if (window.accumulatedMonths > 0) {
                window.accumulatedMonths = 0;
                accumulatedBtn.textContent = 'Acumulado';
                accumulatedBtn.classList.remove('active');
                const monthSelector = document.querySelector('.month-selector');
                if (monthSelector) monthSelector.style.display = 'flex';
            }
        }
    }
    
    // Atualizar dashboard quando a aba for mostrada
    if (subPageId === 'dashboard-content' && typeof updateFullDashboard === 'function') {
        setTimeout(() => updateFullDashboard(), 100);
    }
}

// Função para formatar moeda
function formatCurrency(input) {
    let value = input.value.replace(/[^\d]/g, ''); // Remove tudo exceto dígitos
    if (value) {
        value = parseFloat(value) / 100; // Assume entrada em centavos para facilitar
        input.value = value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else {
        input.value = '';
    }
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    if (message === '') return;

    addMessage(message, 'user');
    saveChatMessage(message, 'user'); // Salvar mensagem do usuário
    input.value = '';

    // Se é a primeira mensagem, marcar chat como iniciado e esconder prompt
    if (!chatStarted) {
        chatStarted = true;
        document.querySelector('.finance-prompt').style.display = 'none';
    }

    // Adicionar mensagem de pensando com ícone animado
    const thinkingMessage = addMessage('', 'bot');
    thinkingMessage.classList.add('thinking');
    thinkingMessage.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Ícone girando

    fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, userId: window.userId })
    })
    .then(response => response.json())
    .then(data => {
        // Remover mensagem de pensando
        thinkingMessage.remove();
        // Adicionar resposta com efeito máquina de escrever
        addMessageTypewriter(data.reply, 'bot');
        saveChatMessage(data.reply, 'bot'); // Salvar resposta do bot
        
        // Recarregar transações se a página de finanças estiver visível
        if (typeof loadTransactionsForMonth === 'function') {
            loadTransactionsForMonth();
        }
        // Atualizar dashboard se a função existir
        if (typeof updateFullDashboard === 'function') {
            updateFullDashboard();
        }
    })
    .catch(error => {
        thinkingMessage.remove();
        addMessage('Erro ao processar mensagem.', 'bot');
        saveChatMessage('Erro ao processar mensagem.', 'bot'); // Salvar erro
        console.error('Erro ao enviar mensagem:', error);
    });
}

function addMessage(text, sender) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    // Renderizar markdown para mensagens carregadas do histórico
    if (sender === 'bot') {
        messageDiv.innerHTML = marked.parse(text);
    } else {
        messageDiv.textContent = text;
    }
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    return messageDiv; // Retorne para poder remover depois
}

function addMessageTypewriter(text, sender) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messagesDiv.appendChild(messageDiv);

    const words = text.split(' ');
    let currentIndex = 0;
    let charIndex = 0;
    let currentWord = '';

    const interval = setInterval(() => {
        if (currentIndex < 5) {
            // Primeiras 5 palavras: letra por letra
            if (charIndex < words[currentIndex].length) {
                currentWord += words[currentIndex][charIndex];
                messageDiv.textContent = words.slice(0, currentIndex).join(' ') + (currentIndex > 0 ? ' ' : '') + currentWord;
                charIndex++;
            } else {
                messageDiv.textContent = words.slice(0, currentIndex + 1).join(' ');
                currentIndex++;
                charIndex = 0;
                currentWord = '';
            }
        } else {
            // A partir da 5ª palavra: palavra por palavra, velocidade dobrada
            if (currentIndex < words.length) {
                messageDiv.textContent = words.slice(0, currentIndex + 1).join(' ');
                currentIndex++;
            } else {
                clearInterval(interval);
                // Renderizar Markdown completo ao final
                messageDiv.innerHTML = marked.parse(text);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        }
    }, currentIndex < 5 ? 100 : 50);

    // Após 3 segundos, mostrar a mensagem completa
    setTimeout(() => {
        clearInterval(interval);
        messageDiv.innerHTML = marked.parse(text);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 3000);
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// === FUNÇÕES DO MODAL DE CHAT (Dashboard e Perfil) ===
function openChatModal() {
    const modal = document.getElementById('ai-chat-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    // Limpar mensagens anteriores
    const messagesDiv = document.getElementById('ai-chat-messages');
    messagesDiv.innerHTML = '';
    
    // Gerar novo conversationId para cada sessão do chat modal
    if (!window.currentModalConversationId) {
        window.currentModalConversationId = Date.now().toString();
    }
    
    // Detectar página/subpágina atual para mensagem contextual
    const activePage = document.querySelector('.page-section.active');
    const activePageId = activePage ? activePage.id : null;
    const activeSubPage = document.querySelector('.subpage.active');
    const activeSubPageId = activeSubPage ? activeSubPage.id : null;
    
    let welcomeMessage = 'Olá! Como posso te auxiliar?';
    
    if (activePageId === 'minhas-financas' && activeSubPageId === 'dashboard-content') {
        welcomeMessage = 'Pergunte sobre seu dashboard';
    } else if (activePageId === 'perfil') {
        welcomeMessage = 'Pergunte sobre seu perfil';
    }
    
    // Adicionar mensagem de boas-vindas contextual
    addChatModalMessage(welcomeMessage, 'bot');
    
    // Inicializar função de arrastar
    makeChatDraggable();
    
    // Focar no input
    setTimeout(() => {
        document.getElementById('ai-chat-input').focus();
    }, 100);
}

function closeChatModal() {
    const modal = document.getElementById('ai-chat-modal');
    if (!modal) return;
    
    modal.style.display = 'none';
    
    // Limpar input
    document.getElementById('ai-chat-input').value = '';
    
    // Resetar conversationId para próxima conversa
    window.currentModalConversationId = null;
}

// Função para tornar o chat arrastável
function makeChatDraggable() {
    const chatContainer = document.getElementById('ai-chat-container');
    const chatHeader = chatContainer.querySelector('.ai-chat-header');
    
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    
    chatHeader.style.cursor = 'move';
    
    chatHeader.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    
    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        
        if (e.target === chatHeader || chatHeader.contains(e.target)) {
            isDragging = true;
        }
    }
    
    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            
            xOffset = currentX;
            yOffset = currentY;
            
            setTranslate(currentX, currentY, chatContainer);
        }
    }
    
    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }
    
    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
}

function sendChatModalMessage() {
    const input = document.getElementById('ai-chat-input');
    const message = input.value.trim();
    
    if (message === '') return;
    
    // Adicionar mensagem do usuário
    addChatModalMessage(message, 'user');
    input.value = '';
    
    // Adicionar mensagem de "pensando"
    const thinkingMessage = addChatModalMessage('', 'bot');
    thinkingMessage.classList.add('thinking');
    thinkingMessage.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // Enviar para a API
    fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, userId: window.userId })
    })
    .then(response => response.json())
    .then(data => {
        // Remover mensagem de pensando
        thinkingMessage.remove();
        
        // Adicionar resposta com efeito de digitação
        addChatModalMessageTypewriter(data.reply, 'bot');
        
        // Recarregar dados se necessário
        if (typeof loadTransactionsForMonth === 'function') {
            loadTransactionsForMonth();
        }
        if (typeof updateFullDashboard === 'function') {
            updateFullDashboard();
        }
        if (typeof loadProfile === 'function') {
            loadProfile();
        }
    })
    .catch(error => {
        thinkingMessage.remove();
        addChatModalMessage('Erro ao processar mensagem. Tente novamente.', 'bot');
        console.error('Erro ao enviar mensagem do chat modal:', error);
    });
}

function addChatModalMessage(text, sender) {
    const messagesDiv = document.getElementById('ai-chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    if (sender === 'bot' && text) {
        messageDiv.innerHTML = marked.parse(text);
    } else {
        messageDiv.textContent = text;
    }
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    return messageDiv;
}

function addChatModalMessageTypewriter(text, sender) {
    const messagesDiv = document.getElementById('ai-chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messagesDiv.appendChild(messageDiv);

    const words = text.split(' ');
    let currentIndex = 0;
    let charIndex = 0;
    let currentWord = '';

    const interval = setInterval(() => {
        if (currentIndex < 5) {
            // Primeiras 5 palavras: letra por letra
            if (charIndex < words[currentIndex].length) {
                currentWord += words[currentIndex][charIndex];
                messageDiv.textContent = words.slice(0, currentIndex).join(' ') + (currentIndex > 0 ? ' ' : '') + currentWord;
                charIndex++;
            } else {
                messageDiv.textContent = words.slice(0, currentIndex + 1).join(' ');
                currentIndex++;
                charIndex = 0;
                currentWord = '';
            }
        } else {
            // A partir da 5ª palavra: palavra por palavra
            if (currentIndex < words.length) {
                messageDiv.textContent = words.slice(0, currentIndex + 1).join(' ');
                currentIndex++;
            } else {
                clearInterval(interval);
                messageDiv.innerHTML = marked.parse(text);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        }
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, currentIndex < 5 ? 100 : 50);

    // Timeout de segurança
    setTimeout(() => {
        clearInterval(interval);
        messageDiv.innerHTML = marked.parse(text);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 3000);
}

function handleChatModalKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChatModalMessage();
    }
}

// === FUNÇÕES DE HISTÓRICO DO CHAT MODAL ===

// Salvar mensagem no histórico
// Funções para histórico de chat
function showChatHistoryModal() {
    const modal = document.getElementById('chat-history-modal');
    modal.style.display = 'block';
    loadChatHistory();
function showChatHistoryModal() {
    const modal = document.getElementById('chat-history-modal');
    modal.style.display = 'block';
    loadChatHistory();
}}

function closeChatHistoryModal() {
    const modal = document.getElementById('chat-history-modal');
    modal.style.display = 'none';
}

async function loadChatHistory() {
    try {
        const response = await fetch(`${API_URL}/chat-history?userId=${window.userId}`);
        const data = await response.json();
        
        const chatList = document.getElementById('chat-history-list');
        chatList.innerHTML = '';
        
        if (data.conversations && data.conversations.length > 0) {
            data.conversations.forEach(conversation => {
                const conversationDiv = document.createElement('div');
                conversationDiv.className = 'chat-history-item';
                conversationDiv.innerHTML = `
                    <div class="chat-history-content">
                        <div class="chat-history-title">${conversation.title || 'Conversa sem título'}</div>
                        <div class="chat-history-date">${new Date(conversation.date).toLocaleDateString('pt-BR')}</div>
                        <div class="chat-history-preview">${conversation.preview || ''}</div>
                    </div>
                    <button class="delete-chat-btn" onclick="deleteConversation('${conversation.id}'); event.stopPropagation();" title="Excluir conversa"><i class="fas fa-trash"></i></button>
                `;
                conversationDiv.onclick = () => loadConversation(conversation.id);
                chatList.appendChild(conversationDiv);
            });
        } else {
            chatList.innerHTML = '<div class="no-history">Nenhuma conversa encontrada</div>';
        }
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        document.getElementById('chat-history-list').innerHTML = '<div class="no-history">Erro ao carregar histórico</div>';
    }
}

async function loadConversation(conversationId) {
    try {
        const response = await fetch(`${API_URL}/chat-history/${conversationId}?userId=${window.userId}`);
        const data = await response.json();
        
        // Limpar chat atual
        document.getElementById('chat-messages').innerHTML = '';
        
        // Carregar mensagens da conversa
        data.messages.forEach(msg => {
            addMessage(msg.text, msg.sender);
        });
        
        // Fechar modal
        closeChatHistoryModal();
        
        // Marcar chat como iniciado e definir conversationId atual
        chatStarted = true;
        window.currentConversationId = conversationId;
        document.querySelector('.finance-prompt').style.display = 'none';
    } catch (error) {
        console.error('Erro ao carregar conversa:', error);
    }
}

async function deleteConversation(conversationId) {
    if (!confirm('Tem certeza que deseja excluir esta conversa?')) return;
    
    try {
        const response = await fetch(`${API_URL}/delete-conversation/${conversationId}?userId=${window.userId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Recarregar histórico
            loadChatHistory();
        } else {
            alert('Erro ao excluir conversa');
        }
    } catch (error) {
        console.error('Erro ao excluir conversa:', error);
        alert('Erro ao excluir conversa');
    }
}

function searchChatHistory() {
    const searchTerm = document.getElementById('chat-history-search').value.toLowerCase();
    const items = document.querySelectorAll('.chat-history-item');
    
    items.forEach(item => {
        const title = item.querySelector('.chat-history-title').textContent.toLowerCase();
        const preview = item.querySelector('.chat-history-preview').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || preview.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Função para mostrar alertas temporários
function showAlert(message) {
    // Remover alertas existentes
    const existingAlerts = document.querySelectorAll('.alert-notification');
    existingAlerts.forEach(alert => alert.remove());

    // Criar novo alerta
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert-notification';
    alertDiv.textContent = message;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--color-surface-elevated);
        color: var(--color-text-primary);
        padding: 12px 20px;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(alertDiv);

    // Remover automaticamente após 3 segundos
    setTimeout(() => {
        alertDiv.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 300);
    }, 3000);
}

async function saveChatMessage(message, sender) {
    if (!window.userId) return;
    
    // Gerar conversationId se não existir (nova conversa por sessão)
    if (!window.currentConversationId) {
        window.currentConversationId = Date.now().toString();
    }
    
    try {
        await fetch(`${API_URL}/save-chat-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message, 
                sender, 
                userId: window.userId,
                conversationId: window.currentConversationId,
                timestamp: new Date().toISOString()
            })
        });
    } catch (error) {
        console.error('Erro ao salvar mensagem:', error);
    }
}

// ==================== SISTEMA DE NOTIFICAÇÕES DE PERFIL ====================

// Função para verificar se o perfil está completo
async function checkProfileCompletion() {
    try {
        const response = await fetch(`${API_URL}/profile/${userId}`);
        const profile = await response.json();
        
        // Campos obrigatórios a verificar
        const requiredFields = {
            pessoal: ['nome', 'idade', 'profissao', 'localizacao', 'contato', 'sobreVoce'],
            financeira: ['dependentes', 'modeloRenda'],
            objetivos: ['poupancaMensal', 'fundoEmergencia', 'prazoEmergencia', 'investimentoMensal', 
                       'metaLongoPrazo', 'valorMetaLongo', 'prazoMetaLongo']
        };
        
        let totalFields = 0;
        let filledFields = 0;
        
        // Verificar cada seção
        for (const [section, fields] of Object.entries(requiredFields)) {
            fields.forEach(field => {
                totalFields++;
                const value = profile[section]?.[field];
                if (value && value.toString().trim() !== '') {
                    filledFields++;
                }
            });
        }
        
        // Retornar status do perfil
        if (filledFields === 0) {
            return { status: 'empty', filled: filledFields, total: totalFields };
        } else if (filledFields < totalFields) {
            return { status: 'partial', filled: filledFields, total: totalFields };
        } else {
            return { status: 'complete', filled: filledFields, total: totalFields };
        }
    } catch (error) {
        console.error('Erro ao verificar perfil:', error);
        return { status: 'error', filled: 0, total: 15 };
    }
}

// Função para mostrar notificação de perfil incompleto
function showProfileNotification(profileStatus) {
    // Verificar se já existe uma notificação visível
    const existingNotification = document.getElementById('profile-notification');
    if (existingNotification) {
        return; // Não mostrar duplicada
    }
    
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.id = 'profile-notification';
    notification.className = 'profile-notification';
    
    let message = '';
    let title = '';
    
    if (profileStatus.status === 'empty') {
        title = '📋 Complete seu Perfil';
        message = 'Complete seu perfil para que o Merfin conheça melhor sua situação financeira e possa oferecer conselhos personalizados!';
    } else if (profileStatus.status === 'partial') {
        title = '⚠️ Perfil Incompleto';
        message = `Complete os campos restantes do seu perfil (${profileStatus.filled}/${profileStatus.total} preenchidos) para melhorar sua experiência com o Merfin!`;
    }
    
    notification.innerHTML = `
        <div class="profile-notification-content">
            <button class="profile-notification-close" onclick="closeProfileNotification()">×</button>
            <strong style="display: block; margin-bottom: var(--spacing-sm);">${title}</strong>
            <p style="margin: 0 0 var(--spacing-md) 0; font-size: 14px;">${message}</p>
            <button class="profile-notification-btn" onclick="goToProfile()">
                Ir para Perfil
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
}

// Função para fechar notificação
function closeProfileNotification() {
    const notification = document.getElementById('profile-notification');
    if (notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
}

// Função para ir para página de perfil
function goToProfile() {
    closeProfileNotification();
    showPage('perfil');
}

// Função para iniciar sistema de notificações de perfil
async function startProfileNotificationSystem() {
    // Verificar perfil inicial
    const profileStatus = await checkProfileCompletion();
    
    // Se perfil está completo, não fazer nada
    if (profileStatus.status === 'complete') {
        return;
    }
    
    // Obter contador de notificações
    let notificationCount = parseInt(sessionStorage.getItem('profileNotificationCount') || '0');
    const lastNotification = parseInt(sessionStorage.getItem('lastProfileNotification') || '0');
    const now = new Date().getTime();
    
    // Determinar intervalo (10 min para primeiras 10, 20 min depois)
    const interval = notificationCount < 10 ? 10 * 60 * 1000 : 20 * 60 * 1000; // em milissegundos
    
    // Verificar se deve mostrar notificação agora
    if (lastNotification === 0 || (now - lastNotification) >= interval) {
        showProfileNotification(profileStatus);
        notificationCount++;
        sessionStorage.setItem('profileNotificationCount', notificationCount.toString());
        sessionStorage.setItem('lastProfileNotification', now.toString());
    }
    
    // Configurar timer para próximas notificações
    if (profileNotificationTimer) {
        clearInterval(profileNotificationTimer);
    }
    
    profileNotificationTimer = setInterval(async () => {
        // Verificar perfil novamente
        const currentProfileStatus = await checkProfileCompletion();
        
        // Se perfil foi completado, parar notificações
        if (currentProfileStatus.status === 'complete') {
            clearInterval(profileNotificationTimer);
            profileNotificationTimer = null;
            closeProfileNotification();
            return;
        }
        
        // Mostrar notificação
        showProfileNotification(currentProfileStatus);
        
        // Atualizar contador
        let count = parseInt(sessionStorage.getItem('profileNotificationCount') || '0');
        count++;
        sessionStorage.setItem('profileNotificationCount', count.toString());
        sessionStorage.setItem('lastProfileNotification', new Date().getTime().toString());
        
        // Atualizar intervalo se necessário (após 10ª notificação)
        if (count === 10) {
            clearInterval(profileNotificationTimer);
            profileNotificationTimer = setInterval(async () => {
                const status = await checkProfileCompletion();
                if (status.status === 'complete') {
                    clearInterval(profileNotificationTimer);
                    profileNotificationTimer = null;
                    closeProfileNotification();
                    return;
                }
                showProfileNotification(status);
                let c = parseInt(sessionStorage.getItem('profileNotificationCount') || '0');
                c++;
                sessionStorage.setItem('profileNotificationCount', c.toString());
                sessionStorage.setItem('lastProfileNotification', new Date().getTime().toString());
            }, 20 * 60 * 1000); // 20 minutos
        }
    }, interval);
}

// Função para reiniciar a animação do botão IA a cada 5 minutos
setInterval(() => {
    const img = document.querySelector('#ai-float-btn img');
    if (img) {
        img.style.animation = 'none';
        setTimeout(() => {
            img.style.animation = 'pulse 2s 5';
        }, 10);
    }
}, 300000); // 5 minutos