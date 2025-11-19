// ==================== DASHBOARD.JS ====================
// API_URL já está declarada no app.js
// ======================================================

// === DASHBOARD FUNCTIONS ===

// Variável global para controlar modo acumulado (0 = mês atual, 3/6/12 = acumulado)
window.accumulatedMonths = 0;

// Função para alternar modo acumulado
function toggleAccumulatedMode() {
    const btn = document.getElementById('accumulated-btn');
    if (!btn) return;

    // Se já está em modo acumulado, voltar para mês atual
    if (window.accumulatedMonths > 0) {
        window.accumulatedMonths = 0;
        btn.textContent = 'Filtro';
        btn.classList.remove('active');
        // Reabilitar month-selector
        const monthSelector = document.querySelector('.month-selector');
        if (monthSelector) monthSelector.style.display = 'flex';
        updateFullDashboard();
        return;
    }

    // Mostrar opções de período acumulado
    const options = [3, 6, 12];
    const optionTexts = ['3 meses', '6 meses', '12 meses'];

    // Criar modal simples para seleção
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: transparent;
        backdrop-filter: blur(0.8px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: var(--color-bg-primary);
        padding: 20px;
        border-radius: 8px;
        border: 1px solid var(--color-border);
        min-width: 250px;
    `;

    modalContent.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: var(--color-text-primary);">Selecionar Período para filtrar</h3>
        ${options.map((opt, index) => `
            <button onclick="selectAccumulatedPeriod(${opt})" 
                    style="display: block; width: 100%; margin: 5px 0; padding: 10px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 4px; color: var(--color-text-primary); cursor: pointer;">
                ${optionTexts[index]}
            </button>
        `).join('')}
        <button onclick="closeAccumulatedModal()" 
                style="display: block; width: 100%; margin: 10px 0 0 0; padding: 10px; background: var(--color-error); border: none; border-radius: 4px; color: white; cursor: pointer;">
            Cancelar
        </button>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Função para fechar modal
    window.closeAccumulatedModal = function() {
        modal.remove();
    };

    // Função para selecionar período
    window.selectAccumulatedPeriod = function(months) {
        window.accumulatedMonths = months;
        btn.textContent = `${months} meses`;
        btn.classList.add('active');
        // Ocultar month-selector
        const monthSelector = document.querySelector('.month-selector');
        if (monthSelector) monthSelector.style.display = 'none';
        modal.remove();
        updateFullDashboard();
    };
}

// Frases motivacionais
const motivationalQuotes = [
    {
        text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
        author: "Robert Collier"
    },
    {
        text: "Não espere por oportunidades extraordinárias. Agarre as oportunidades comuns e as torne extraordinárias.",
        author: "Orison Swett Marden"
    },
    {
        text: "A disciplina é a ponte entre metas e conquistas.",
        author: "Jim Rohn"
    },
    {
        text: "O investimento em conhecimento rende os melhores juros.",
        author: "Benjamin Franklin"
    },
    {
        text: "O dinheiro é um bom servo, mas um mau mestre.",
        author: "Francis Bacon"
    },
    {
        text: "Riqueza é o resultado de decisões corretas tomadas consistentemente ao longo do tempo.",
        author: "Tony Robbins"
    },
    {
        text: "Não economize o que sobra depois de gastar, mas gaste o que sobra depois de economizar.",
        author: "Warren Buffett"
    },
    {
        text: "O primeiro passo para sair da pobreza é decidir que você merece ser rico.",
        author: "Louise Hay"
    },
    {
        text: "A paciência é amarga, mas seus frutos são doces.",
        author: "Aristóteles"
    },
    {
        text: "O futuro depende do que você faz hoje.",
        author: "Mahatma Gandhi"
    }
];

// Função para obter frase motivacional do dia
function getDailyMotivationalQuote() {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    const quoteIndex = dayOfYear % motivationalQuotes.length;
    return motivationalQuotes[quoteIndex];
}

// Função para atualizar frase motivacional
function updateMotivationalQuote() {
    const quote = getDailyMotivationalQuote();
    const quoteTextElement = document.getElementById('quote-text');
    const quoteAuthorElement = document.getElementById('quote-author');

    if (quoteTextElement && quoteAuthorElement) {
        quoteTextElement.textContent = quote.text;
        quoteAuthorElement.textContent = `— ${quote.author}`;
    }
}

let dashboardChart = null;
let receitasPieChart = null;
let despesasPieChart = null;
let subcategoriasReceitasChart = null;
let subcategoriasDespesasChart = null;

// Atualizar dashboard completo
function updateFullDashboard() {
    console.log('🎯 Atualizando dashboard completo...');
    updateDashboardSummary();
    updateReceitasCategorias();
    updateDespesasCategorias();
    updateReceitasPieChart();
    updateDespesasPieChart();
    updateSubcategoriasReceitasChart();
    updateSubcategoriasDespesasChart();
    updateObjetivosFinanceiros();
    updateDividasDashboard();
    updateMotivationalQuote(); // Adicionar atualização da frase motivacional
    console.log('✅ Dashboard atualizado com sucesso!');
}

// Atualizar cards superiores
function updateDashboardSummary() {
    if (!window.userId) return;

    // Calcular mês de referência atual
    const year = window.currentMonth.getFullYear();
    const month = String(window.currentMonth.getMonth() + 1).padStart(2, '0');
    const mesReferenciaAtual = `${year}-${month}`;
    
    console.log('💰 [Dashboard] Calculando saldo até o mês:', mesReferenciaAtual);

    // Buscar transações
    fetch(`${API_URL}/transactions/${window.userId}`)
    .then(response => response.json())
    .then(allTransactions => {
        let filteredTransactions;
        let totalReceitas = 0;
        let totalDespesas = 0;

        if (window.accumulatedMonths > 0) {
            // Modo acumulado: filtrar últimos X meses
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth() - window.accumulatedMonths + 1, 1);
            filteredTransactions = allTransactions.filter(trans => {
                const transDate = new Date(trans.data);
                return transDate >= startDate;
            });
            
            // Calcular totais apenas RECEBIDO/PAGO no modo acumulado
            filteredTransactions.forEach(trans => {
                const valor = parseCurrency(trans.valor);
                if (trans.type === 'receitas' && trans.status === 'Recebido') {
                    totalReceitas += valor;
                } else if (trans.type === 'despesas' && trans.status === 'Pago') {
                    totalDespesas += valor;
                }
            });
        } else {
            // Modo mês atual: 
            // - Para SALDO: usar todas as transações até o mês atual (passado + presente)
            // - Para RECEITAS/DESPESAS: usar apenas do mês atual
            
            // Filtrar transações do mês atual para mostrar nos cards de receitas/despesas
            const transacoesMesAtual = allTransactions.filter(trans => {
                return trans.mesReferencia === mesReferenciaAtual;
            });
            
            transacoesMesAtual.forEach(trans => {
                const valor = parseCurrency(trans.valor);
                if (trans.type === 'receitas' && trans.status === 'Recebido') {
                    totalReceitas += valor;
                } else if (trans.type === 'despesas' && trans.status === 'Pago') {
                    totalDespesas += valor;
                }
            });
            
            // Para o saldo, usar todas até o mês atual
            filteredTransactions = allTransactions.filter(trans => {
                return trans.mesReferencia && trans.mesReferencia <= mesReferenciaAtual;
            });
        }

        const saldoLiquidoTransacoes = totalReceitas - totalDespesas;
        
        // Para o saldo acumulado, calcular usando TODAS as transações até o mês atual (APENAS RECEBIDO/PAGO)
        let receitasAcumuladas = 0;
        let despesasAcumuladas = 0;
        
        filteredTransactions.forEach(trans => {
            const valor = parseCurrency(trans.valor);
            if (trans.type === 'receitas' && trans.status === 'Recebido') {
                receitasAcumuladas += valor;
            } else if (trans.type === 'despesas' && trans.status === 'Pago') {
                despesasAcumuladas += valor;
            }
        });
        
        const saldoAcumulado = receitasAcumuladas - despesasAcumuladas;
        
        console.log('📊 [Dashboard] Transações até', mesReferenciaAtual, ':', filteredTransactions.length);
        console.log('💵 [Dashboard] Receitas mês atual:', formatCurrencyValue(totalReceitas));
        console.log('💸 [Dashboard] Despesas mês atual:', formatCurrencyValue(totalDespesas));
        console.log('📈 [Dashboard] Saldo acumulado (transações):', formatCurrencyValue(saldoAcumulado));

        // Calcular patrimônio total (sempre do perfil atual, não acumulado)
        fetch(`${API_URL}/profile/${window.userId}`)
        .then(response => response.json())
        .then(profile => {
            const patrimonioData = profile.financeira?.patrimonio || [];
            const patrimonioTotal = patrimonioData.reduce((sum, item) => {
                const valor = parseCurrency(item?.valor || '0');
                return sum + valor;
            }, 0);

            // Popular tabela do tooltip de patrimônio
            const patrimonioTooltipBody = document.getElementById('patrimonio-tooltip-body');
            if (patrimonioTooltipBody) {
                patrimonioTooltipBody.innerHTML = '';
                if (patrimonioData.length > 0) {
                    patrimonioData.forEach(item => {
                        const row = document.createElement('tr');
                        const valorNumerico = parseCurrency(item?.valor || '0');
                        const valorFormatado = formatCurrencyValue(valorNumerico);
                        row.innerHTML = `
                            <td>${item?.tipo || 'N/A'}</td>
                            <td>${valorFormatado}</td>
                        `;
                        patrimonioTooltipBody.appendChild(row);
                    });
                } else {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td colspan="2" style="text-align: center; color: var(--color-text-secondary); font-size: 0.7em;">Nenhum patrimônio cadastrado</td>
                    `;
                    patrimonioTooltipBody.appendChild(row);
                }
            }

            // Atualizar cards do dashboard
            const dashSaldo = document.getElementById('dash-saldo-liquido');
            const dashReceitas = document.getElementById('dash-total-receitas');
            const dashDespesas = document.getElementById('dash-total-despesas');
            const dashPatrimonio = document.getElementById('dash-patrimonio-total');

            if (dashSaldo) dashSaldo.textContent = formatCurrencyValue(saldoAcumulado);
            if (dashReceitas) dashReceitas.textContent = formatCurrencyValue(totalReceitas);
            if (dashDespesas) dashDespesas.textContent = formatCurrencyValue(totalDespesas);
            if (dashPatrimonio) dashPatrimonio.textContent = formatCurrencyValue(patrimonioTotal);
        })
        .catch(error => {
            console.error('Erro ao carregar perfil para dashboard:', error);
            // Fallback sem patrimônio - usar apenas transações
            const dashSaldo = document.getElementById('dash-saldo-liquido');
            const dashReceitas = document.getElementById('dash-total-receitas');
            const dashDespesas = document.getElementById('dash-total-despesas');

            if (dashSaldo) dashSaldo.textContent = formatCurrencyValue(saldoAcumulado);
            if (dashReceitas) dashReceitas.textContent = formatCurrencyValue(totalReceitas);
            if (dashDespesas) dashDespesas.textContent = formatCurrencyValue(totalDespesas);
        });
    })
    .catch(error => {
        console.error('Erro ao carregar transações para dashboard:', error);
    });
}

// Atualizar receitas por categoria
function updateReceitasCategorias() {
    const container = document.getElementById('receitas-categorias');
    if (!container || !window.userId) return;

    // Buscar transações
    fetch(`${API_URL}/transactions/${window.userId}`)
    .then(response => response.json())
    .then(allTransactions => {
        let filteredTransactions;

        if (window.accumulatedMonths > 0) {
            // Modo acumulado: filtrar últimos X meses
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth() - window.accumulatedMonths + 1, 1);
            filteredTransactions = allTransactions.filter(trans => {
                const transDate = new Date(trans.data);
                return transDate >= startDate && trans.type === 'receitas' && trans.status === 'Recebido';
            });
        } else {
            // Modo mês atual - usar mesReferencia para sincronizar com "Minhas Finanças"
            const year = window.currentMonth.getFullYear();
            const month = String(window.currentMonth.getMonth() + 1).padStart(2, '0');
            const mesReferencia = `${year}-${month}`;
            
            filteredTransactions = allTransactions.filter(trans => {
                return trans.mesReferencia === mesReferencia && trans.type === 'receitas' && trans.status === 'Recebido';
            });
        }

        const categorias = {};
        let totalRecorrente = 0;
        let totalVariavel = 0;

        filteredTransactions.forEach(trans => {
            const categoria = trans.categoria || 'Sem categoria';
            const subcategoria = trans.subcategoria || 'Sem subcategoria';
            const valor = parseCurrency(trans.valor);
            const tipo = trans.subType === 'recorrente' ? 'recorrente' : 'variavel';

            if (valor > 0) {
                if (tipo === 'recorrente') totalRecorrente += valor;
                else totalVariavel += valor;

                if (!categorias[categoria]) {
                    categorias[categoria] = { total: 0, subcategorias: {}, tipo };
                }
                categorias[categoria].total += valor;
                if (!categorias[categoria].subcategorias[subcategoria]) {
                    categorias[categoria].subcategorias[subcategoria] = 0;
                }
                categorias[categoria].subcategorias[subcategoria] += valor;
            }
        });

        const totalGeral = totalRecorrente + totalVariavel;
        renderCategorias(container, categorias, totalGeral, 'receitas');

        // Atualizar totais
        document.getElementById('receita-recorrente-total').textContent = formatCurrencyValue(totalRecorrente);
        document.getElementById('receita-variavel-total').textContent = formatCurrencyValue(totalVariavel);
        document.getElementById('receita-total-geral').textContent = formatCurrencyValue(totalGeral);
    })
    .catch(error => {
        console.error('Erro ao carregar receitas para categorias:', error);
    });
}

// Atualizar despesas por categoria
function updateDespesasCategorias() {
    const container = document.getElementById('despesas-categorias');
    if (!container || !window.userId) return;

    // Buscar transações
    fetch(`${API_URL}/transactions/${window.userId}`)
    .then(response => response.json())
    .then(allTransactions => {
        let filteredTransactions;

        if (window.accumulatedMonths > 0) {
            // Modo acumulado: filtrar últimos X meses
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth() - window.accumulatedMonths + 1, 1);
            filteredTransactions = allTransactions.filter(trans => {
                const transDate = new Date(trans.data);
                return transDate >= startDate && trans.type === 'despesas' && trans.status === 'Pago';
            });
        } else {
            // Modo mês atual - usar mesReferencia para sincronizar com "Minhas Finanças"
            const year = window.currentMonth.getFullYear();
            const month = String(window.currentMonth.getMonth() + 1).padStart(2, '0');
            const mesReferencia = `${year}-${month}`;
            
            filteredTransactions = allTransactions.filter(trans => {
                return trans.mesReferencia === mesReferencia && trans.type === 'despesas' && trans.status === 'Pago';
            });
        }

        const categorias = {};
        let totalFixa = 0;
        let totalVariavel = 0;

        filteredTransactions.forEach(trans => {
            const categoria = trans.categoria || 'Sem categoria';
            const subcategoria = trans.subcategoria || 'Sem subcategoria';
            const valor = parseCurrency(trans.valor);
            const tipo = trans.subType === 'fixa' ? 'fixa' : 'variavel';

            if (valor > 0) {
                if (tipo === 'fixa') totalFixa += valor;
                else totalVariavel += valor;

                if (!categorias[categoria]) {
                    categorias[categoria] = { total: 0, subcategorias: {}, tipo };
                }
                categorias[categoria].total += valor;
                if (!categorias[categoria].subcategorias[subcategoria]) {
                    categorias[categoria].subcategorias[subcategoria] = 0;
                }
                categorias[categoria].subcategorias[subcategoria] += valor;
            }
        });

        const totalGeral = totalFixa + totalVariavel;
        renderCategorias(container, categorias, totalGeral, 'despesas');

        // Atualizar totais
        document.getElementById('despesa-fixa-total').textContent = formatCurrencyValue(totalFixa);
        document.getElementById('despesa-variavel-total').textContent = formatCurrencyValue(totalVariavel);
        document.getElementById('despesa-total-geral').textContent = formatCurrencyValue(totalGeral);
    })
    .catch(error => {
        console.error('Erro ao carregar despesas para categorias:', error);
    });
}

// Atualizar gráfico de rosca de receitas
function updateReceitasPieChart() {
    const canvas = document.getElementById('receitas-pie-chart');
    if (!canvas || !window.userId) return;

    const ctx = canvas.getContext('2d');

    // Buscar transações
    fetch(`${API_URL}/transactions/${window.userId}`)
    .then(response => response.json())
    .then(allTransactions => {
        let filteredTransactions;

        if (window.accumulatedMonths > 0) {
            // Modo acumulado: filtrar últimos X meses
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth() - window.accumulatedMonths + 1, 1);
            filteredTransactions = allTransactions.filter(trans => {
                const transDate = new Date(trans.data);
                return transDate >= startDate && trans.type === 'receitas' && trans.status === 'Recebido';
            });
        } else {
            // Modo mês atual - usar mesReferencia para sincronizar com "Minhas Finanças"
            const year = window.currentMonth.getFullYear();
            const month = String(window.currentMonth.getMonth() + 1).padStart(2, '0');
            const mesReferencia = `${year}-${month}`;
            
            filteredTransactions = allTransactions.filter(trans => {
                return trans.mesReferencia === mesReferencia && trans.type === 'receitas' && trans.status === 'Recebido';
            });
        }

        // Coletar dados das categorias
        const categorias = {};
        let total = 0;

        filteredTransactions.forEach(trans => {
            const categoria = trans.categoria || 'Sem categoria';
            const valor = parseCurrency(trans.valor);
            
            if (valor > 0 && categoria !== 'Selecione uma categoria' && categoria !== '') {
                categorias[categoria] = (categorias[categoria] || 0) + valor;
                total += valor;
            }
        });

    // Destruir gráfico anterior
    if (receitasPieChart) {
        receitasPieChart.destroy();
    }

    // Preparar dados
    const labels = Object.keys(categorias);
    const data = Object.values(categorias);

    // Verificar se há dados
    const chartContainer = canvas.parentElement;
    let noDataMessage = chartContainer.querySelector('.no-data-message');

    if (labels.length === 0) {
        // Ocultar canvas e mostrar mensagem
        canvas.style.display = 'none';
        if (!noDataMessage) {
            noDataMessage = document.createElement('div');
            noDataMessage.className = 'no-data-message';
            noDataMessage.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--color-text-secondary);">
                    <p style="margin: 0; font-size: 16px;">Assim que você fizer suas lançamentos, o gráfico aparecerá.</p>
                    <p style="margin: 10px 0 0 0; font-size: 14px;">Não está aparecendo pois não há lançamentos.</p>
                </div>
            `;
            chartContainer.appendChild(noDataMessage);
        } else {
            noDataMessage.style.display = 'block';
        }
        return;
    } else {
        // Mostrar canvas e ocultar mensagem
        canvas.style.display = 'block';
        if (noDataMessage) {
            noDataMessage.style.display = 'none';
        }
    }

    const chartColors = [
        'rgba(255, 201, 4, 0.13)',   // Tom mais forte
        'rgba(126, 106, 34, 0.13)',
        'rgba(150, 120, 10, 0.7)',
        'rgba(255, 200, 0, 0.6)',
        'rgba(80, 63, 0, 0.5)',
        'rgba(185, 233, 63, 0.4)',
        'rgba(204, 112, 31, 0.3)',
        'rgba(129, 194, 63, 0.25)',
        'rgba(182, 162, 91, 0.2)',
        'rgba(130, 110, 40, 0.15)'   // Tom mais suave
    ];
    const colors = labels.map((_, index) => chartColors[index % chartColors.length]);
    const borderColors = colors.map(color => color.replace(/0\.\d+/, '0.5')); // Bordas com alpha 0.5 para contraste        // Criar novo gráfico
        receitasPieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e1e1e',
                        titleColor: '#fff',
                        bodyColor: '#a0a0a0',
                        borderColor: '#333',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                const value = formatCurrencyValue(context.raw);
                                const percent = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${value} (${percent}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Criar legenda customizada em colunas de 3
        const legendContainer = document.createElement('div');
        legendContainer.className = 'chart-legend';
        legendContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            margin-top: 10px;
            max-width: 100%;
        `;

        labels.forEach((label, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                align-items: center;
                margin: 5px 10px;
                font-size: 11px;
                color: #a0a0a0;
                font-family: Poppins;
                flex: 0 0 auto;
                min-width: 0;
            `;

            const colorBox = document.createElement('div');
            colorBox.style.cssText = `
                width: 12px;
                height: 12px;
                background-color: ${colors[index]};
                border: 1px solid ${borderColors[index]};
                margin-right: 5px;
                border-radius: 2px;
                flex-shrink: 0;
            `;

            item.appendChild(colorBox);
            item.appendChild(document.createTextNode(label));
            legendContainer.appendChild(item);
        });

        const container = canvas.parentElement;
        const existingLegend = container.querySelector('.chart-legend');
        if (existingLegend) existingLegend.remove();
        container.appendChild(legendContainer);
    })
    .catch(error => {
        console.error('Erro ao carregar receitas para gráfico:', error);
    });
}

// Atualizar gráfico de rosca de despesas
function updateDespesasPieChart() {
    const canvas = document.getElementById('despesas-pie-chart');
    if (!canvas || !window.userId) return;

    const ctx = canvas.getContext('2d');

    // Buscar transações
    fetch(`${API_URL}/transactions/${window.userId}`)
    .then(response => response.json())
    .then(allTransactions => {
        let filteredTransactions;

        if (window.accumulatedMonths > 0) {
            // Modo acumulado: filtrar últimos X meses
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth() - window.accumulatedMonths + 1, 1);
            filteredTransactions = allTransactions.filter(trans => {
                const transDate = new Date(trans.data);
                return transDate >= startDate && trans.type === 'despesas' && trans.status === 'Pago';
            });
        } else {
            // Modo mês atual - usar mesReferencia para sincronizar com "Minhas Finanças"
            const year = window.currentMonth.getFullYear();
            const month = String(window.currentMonth.getMonth() + 1).padStart(2, '0');
            const mesReferencia = `${year}-${month}`;
            
            filteredTransactions = allTransactions.filter(trans => {
                return trans.mesReferencia === mesReferencia && trans.type === 'despesas' && trans.status === 'Pago';
            });
        }

        // Coletar dados das categorias
        const categorias = {};
        let total = 0;

        filteredTransactions.forEach(trans => {
            const categoria = trans.categoria || 'Sem categoria';
            const valor = parseCurrency(trans.valor);
            
            if (valor > 0 && categoria !== 'Selecione uma categoria' && categoria !== '') {
                categorias[categoria] = (categorias[categoria] || 0) + valor;
                total += valor;
            }
        });

    // Destruir gráfico anterior
    if (despesasPieChart) {
        despesasPieChart.destroy();
    }

    // Preparar dados
    const labels = Object.keys(categorias);
    const data = Object.values(categorias);

    // Verificar se há dados
    const chartContainer = canvas.parentElement;
    let noDataMessage = chartContainer.querySelector('.no-data-message');

    if (labels.length === 0) {
        // Ocultar canvas e mostrar mensagem
        canvas.style.display = 'none';
        if (!noDataMessage) {
            noDataMessage = document.createElement('div');
            noDataMessage.className = 'no-data-message';
            noDataMessage.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--color-text-secondary);">
                    <p style="margin: 0; font-size: 16px;">Assim que você fizer suas lançamentos, o gráfico aparecerá.</p>
                    <p style="margin: 10px 0 0 0; font-size: 14px;">Não está aparecendo pois não há lançamentos.</p>
                </div>
            `;
            chartContainer.appendChild(noDataMessage);
        } else {
            noDataMessage.style.display = 'block';
        }
        return;
    } else {
        // Mostrar canvas e ocultar mensagem
        canvas.style.display = 'block';
        if (noDataMessage) {
            noDataMessage.style.display = 'none';
        }
    }

    const chartColors = [
        'rgba(255, 201, 4, 0.13)',   // Tom mais forte
        'rgba(126, 106, 34, 0.13)',
        'rgba(150, 120, 10, 0.7)',
        'rgba(255, 200, 0, 0.6)',
        'rgba(80, 63, 0, 0.5)',
        'rgba(185, 233, 63, 0.4)',
        'rgba(204, 112, 31, 0.3)',
        'rgba(129, 194, 63, 0.25)',
        'rgba(182, 162, 91, 0.2)',
        'rgba(130, 110, 40, 0.15)'    // Tom mais suave
    ];
    const colors = labels.map((_, index) => chartColors[index % chartColors.length]);
    const borderColors = colors.map(color => color.replace(/0\.\d+/, '0.5')); // Bordas com alpha 0.5 para contraste        // Criar novo gráfico
        despesasPieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e1e1e',
                        titleColor: '#fff',
                        bodyColor: '#a0a0a0',
                        borderColor: '#333',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                const value = formatCurrencyValue(context.raw);
                                const percent = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${value} (${percent}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Criar legenda customizada em colunas de 3
        const legendContainer = document.createElement('div');
        legendContainer.className = 'chart-legend';
        legendContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            margin-top: 10px;
            max-width: 100%;
        `;

        labels.forEach((label, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                align-items: center;
                margin: 5px 10px;
                font-size: 11px;
                color: #a0a0a0;
                font-family: Poppins;
                flex: 0 0 auto;
                min-width: 0;
            `;

            const colorBox = document.createElement('div');
            colorBox.style.cssText = `
                width: 12px;
                height: 12px;
                background-color: ${colors[index]};
                border: 1px solid ${borderColors[index]};
                margin-right: 5px;
                border-radius: 2px;
                flex-shrink: 0;
            `;

            item.appendChild(colorBox);
            item.appendChild(document.createTextNode(label));
            legendContainer.appendChild(item);
        });

        const container = canvas.parentElement;
        const existingLegend = container.querySelector('.chart-legend');
        if (existingLegend) existingLegend.remove();
        container.appendChild(legendContainer);
    })
    .catch(error => {
        console.error('Erro ao carregar despesas para gráfico:', error);
    });
}

// Renderizar categorias
function renderCategorias(container, categorias, total, tipo) {
    // Ordenar categorias por valor
    const categoriasArray = Object.entries(categorias).map(([nome, dados]) => ({
        nome,
        ...dados
    })).sort((a, b) => b.total - a.total);

    // Mostrar apenas top 5 inicialmente
    const top5 = categoriasArray.slice(0, 5);
    const resto = categoriasArray.slice(5);

    container.innerHTML = '';

    if (categoriasArray.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--color-text-secondary); padding: var(--spacing-lg);">Nenhuma ${tipo} cadastrada</p>`;
        return;
    }

    // Renderizar top 5
    top5.forEach(cat => renderCategoriaItem(container, cat, total));

    // Botão "Ver mais" se houver mais categorias
    if (resto.length > 0) {
        const btnVerMais = document.createElement('button');
        btnVerMais.className = 'ver-mais-btn';
        btnVerMais.textContent = `Ver mais ${resto.length} categoria${resto.length > 1 ? 's' : ''}`;
        btnVerMais.onclick = () => {
            resto.forEach(cat => renderCategoriaItem(container, cat, total));
            btnVerMais.remove();
        };
        container.appendChild(btnVerMais);
    }
}

// Renderizar item de categoria
function renderCategoriaItem(container, categoria, total) {
    const percent = total > 0 ? ((categoria.total / total) * 100).toFixed(1) : 0;
    
    // Pegar top 3 subcategorias
    const subcategoriasArray = Object.entries(categoria.subcategorias)
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 3);

    const item = document.createElement('div');
    item.className = 'categoria-item';
    
    item.innerHTML = `
        <div class="categoria-header">
            <div class="categoria-info">
                <span class="categoria-nome">${categoria.nome}</span>
                <div class="categoria-bar-container">
                    <div class="categoria-bar-fill" style="width: ${percent}%"></div>
                </div>
                <span class="categoria-valor">${formatCurrencyValue(categoria.total)}</span>
                <span class="categoria-percent">${percent}%</span>
            </div>
            <span class="categoria-expand-icon">▼</span>
        </div>
        <div class="subcategorias-list">
            ${subcategoriasArray.map(sub => `
                <div class="subcategoria-item">
                    <span class="subcategoria-nome">${sub.nome}</span>
                    <span class="subcategoria-valor">${formatCurrencyValue(sub.valor)}</span>
                </div>
            `).join('')}
        </div>
    `;

    // Toggle expansão
    const header = item.querySelector('.categoria-header');
    header.onclick = () => item.classList.toggle('expanded');

    container.appendChild(item);
}

// Atualizar gráfico de distribuição
function updateDistributionChart() {
    const canvas = document.getElementById('distribution-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Calcular totais
    let totalReceitas = 0;
    let totalDespesas = 0;

    document.querySelectorAll('#receitas-recorrentes-table tbody tr, #receitas-variaveis-table tbody tr').forEach(row => {
        const valorIndex = row.cells.length === 8 ? 3 : 3;
        totalReceitas += parseCurrency(row.cells[valorIndex].querySelector('input').value);
    });

    document.querySelectorAll('#despesas-fixas-table tbody tr, #despesas-variaveis-table tbody tr').forEach(row => {
        const valorIndex = 5;
        totalDespesas += parseCurrency(row.cells[valorIndex].querySelector('input').value);
    });

    // Destruir gráfico anterior
    if (dashboardChart) {
        dashboardChart.destroy();
    }

    // Verificar se há dados
    const chartContainer = canvas.parentElement;
    let noDataMessage = chartContainer.querySelector('.no-data-message');

    if (totalReceitas === 0 && totalDespesas === 0) {
        // Ocultar canvas e mostrar mensagem
        canvas.style.display = 'none';
        if (!noDataMessage) {
            noDataMessage = document.createElement('div');
            noDataMessage.className = 'no-data-message';
            noDataMessage.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--color-text-secondary);">
                    <p style="margin: 0; font-size: 16px;">Assim que você fizer suas lançamentos, o gráfico aparecerá.</p>
                    <p style="margin: 10px 0 0 0; font-size: 14px;">Não está aparecendo pois não há lançamentos.</p>
                </div>
            `;
            chartContainer.appendChild(noDataMessage);
        } else {
            noDataMessage.style.display = 'block';
        }
        return;
    } else {
        // Mostrar canvas e ocultar mensagem
        canvas.style.display = 'block';
        if (noDataMessage) {
            noDataMessage.style.display = 'none';
        }
    }

    // Criar novo gráfico
    dashboardChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Receitas', 'Despesas'],
            datasets: [{
                data: [totalReceitas, totalDespesas],
                backgroundColor: [
                    'rgba(255, 255, 255, 0.15)',
                    'rgba(255, 255, 255, 0.05)'
                ],
                borderColor: [
                    'rgba(255, 255, 255, 0.3)',
                    'rgba(255, 255, 255, 0.1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1e1e1e',
                    titleColor: '#fff',
                    bodyColor: '#a0a0a0',
                    borderColor: '#333',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const value = formatCurrencyValue(context.raw);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percent = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${value} (${percent}%)`;
                        }
                    }
                }
            }
        }
    });

    // Criar legenda customizada
    const legendContainer = document.createElement('div');
    legendContainer.className = 'chart-legend';
    legendContainer.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 10px;
        max-width: 100%;
    `;

    const labels = ['Receitas', 'Despesas'];
    const colors = [
        'rgba(255, 255, 255, 0.15)',
        'rgba(255, 255, 255, 0.05)'
    ];
    const borderColors = [
        'rgba(255, 255, 255, 0.3)',
        'rgba(255, 255, 255, 0.1)'
    ];

    labels.forEach((label, index) => {
        const item = document.createElement('div');
        item.style.cssText = `
            display: flex;
            align-items: center;
            margin: 5px 10px;
            font-size: 12px;
            color: #a0a0a0;
            font-family: Poppins;
            flex: 0 0 auto;
            min-width: 0;
        `;

        const colorBox = document.createElement('div');
        colorBox.style.cssText = `
            width: 12px;
            height: 12px;
            background-color: ${colors[index]};
            border: 1px solid ${borderColors[index]};
            margin-right: 5px;
            border-radius: 2px;
            flex-shrink: 0;
        `;

        item.appendChild(colorBox);
        item.appendChild(document.createTextNode(label));
        legendContainer.appendChild(item);
    });

    const container = canvas.parentElement;
    const existingLegend = container.querySelector('.chart-legend');
    if (existingLegend) existingLegend.remove();
    container.appendChild(legendContainer);
}

// Atualizar situação financeira
function updateSituacaoFinanceira() {
    // Usar os mesmos valores dos cards superiores
    const saldoLiquido = parseCurrency(document.getElementById('dash-saldo-liquido')?.textContent || '0');
    const totalReceitas = parseCurrency(document.getElementById('dash-total-receitas')?.textContent || '0');
    const totalDespesas = parseCurrency(document.getElementById('dash-total-despesas')?.textContent || '0');

    document.getElementById('renda-media').textContent = formatCurrencyValue(totalReceitas);
    document.getElementById('despesa-media').textContent = formatCurrencyValue(totalDespesas);
    document.getElementById('saldo-atual').textContent = formatCurrencyValue(saldoLiquido);
}

// Atualizar objetivos financeiros
async function updateObjetivosFinanceiros() {
    const container = document.getElementById('objetivos-list');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/profile/${userId}`);
        const profile = await response.json();
        const objetivos = profile.objetivos || {};

        container.innerHTML = '';

        // Fundo de emergência
        if (objetivos.fundoEmergencia) {
            const meta = parseCurrency(objetivos.fundoEmergencia);
            const saldoAtual = parseCurrency(document.getElementById('dash-saldo-liquido')?.textContent || '0');
            const progresso = meta > 0 ? Math.min((saldoAtual / meta) * 100, 100) : 0;

            container.innerHTML += `
                <div class="objetivo-item">
                    <div class="objetivo-header">
                        <span class="objetivo-nome">Fundo de Emergência</span>
                        <span class="objetivo-percent">${progresso.toFixed(0)}%</span>
                    </div>
                    <div class="objetivo-progress-bar">
                        <div class="objetivo-progress-fill" style="width: ${progresso}%"></div>
                    </div>
                    <div class="objetivo-valores">
                        <span>${formatCurrencyValue(saldoAtual)}</span>
                        <span>${formatCurrencyValue(meta)}</span>
                    </div>
                </div>
            `;
        }

        // Meta de longo prazo
        if (objetivos.metaLongoPrazo && objetivos.valorMetaLongo) {
            const meta = parseCurrency(objetivos.valorMetaLongo);
            const saldoAtual = parseCurrency(document.getElementById('dash-saldo-liquido')?.textContent || '0');
            const progresso = meta > 0 ? Math.min((saldoAtual / meta) * 100, 100) : 0;

            container.innerHTML += `
                <div class="objetivo-item">
                    <div class="objetivo-header">
                        <span class="objetivo-nome">${objetivos.metaLongoPrazo}</span>
                        <span class="objetivo-percent">${progresso.toFixed(0)}%</span>
                    </div>
                    <div class="objetivo-progress-bar">
                        <div class="objetivo-progress-fill" style="width: ${progresso}%"></div>
                    </div>
                    <div class="objetivo-valores">
                        <span>${formatCurrencyValue(saldoAtual)}</span>
                        <span>${formatCurrencyValue(meta)}</span>
                    </div>
                </div>
            `;
        }

        if (container.innerHTML === '') {
            container.innerHTML = '<div class="objetivo-empty">Nenhum objetivo financeiro cadastrado. Configure seus objetivos na página de perfil.</div>';
        }
    } catch (error) {
        console.error('Erro ao carregar objetivos:', error);
        container.innerHTML = '<div class="objetivo-empty">Erro ao carregar objetivos</div>';
    }
}

// Atualizar dívidas no dashboard
async function updateDividasDashboard() {
    const container = document.getElementById('dividas-dashboard-list');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/dividas/${userId}`);
        const dividas = await response.json();

        container.innerHTML = '';

        if (!dividas || dividas.length === 0) {
            container.innerHTML = '<div class="dividas-empty">Nenhuma dívida ativa</div>';
            return;
        }

        dividas.forEach(divida => {
            const parcelasPagas = divida.parcelas.filter(p => p.pago).length;
            const totalParcelas = divida.parcelas.length;
            const percentualPago = totalParcelas > 0 ? Math.round((parcelasPagas / totalParcelas) * 100) : 0;

            container.innerHTML += `
                <div class="divida-dashboard-item">
                    <div class="divida-dashboard-info">
                        <div class="divida-dashboard-nome">${divida.nome}</div>
                        <div class="divida-dashboard-detalhes">
                            ${parcelasPagas}/${totalParcelas} parcelas pagas (${percentualPago}%)
                        </div>
                    </div>
                    <div class="divida-dashboard-valor">${divida.valorTotal}</div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Erro ao carregar dívidas:', error);
        container.innerHTML = '<div class="dividas-empty">Erro ao carregar dívidas</div>';
    }
}

// Chamar ao trocar para o dashboard
function onDashboardShow() {
    updateFullDashboard();
    loadNotes();
    // Mostrar botão acumulado
    const accumulatedBtn = document.getElementById('accumulated-btn');
    if (accumulatedBtn) {
        accumulatedBtn.style.display = 'inline-block';
    }
}

// Adicionar listener para quando o dashboard for mostrado
document.addEventListener('DOMContentLoaded', () => {
    const dashboardBtn = document.querySelector('[onclick*="dashboard-content"]');
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', () => {
            setTimeout(onDashboardShow, 100);
        });
    }
    
    // Auto-save das anotações quando o usuário digita
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('notes-input')) {
            saveNotes();
        }
    });
});

// === SISTEMA DE ANOTAÇÕES ===

let currentNotesPage = 1;
let notesData = {}; // Estrutura: { userId: { pageNumber: [linha1, linha2, ...] } }

// Carregar anotações do servidor
async function loadNotes() {
    if (!userId) return;
    
    try {
        const response = await fetch(`${API_URL}/notes/${userId}`);
        const data = await response.json();
        notesData[userId] = data.notes || {};
        renderNotesPage(currentNotesPage);
    } catch (error) {
        console.error('Erro ao carregar anotações:', error);
        notesData[userId] = {};
    }
}

// Salvar anotações no servidor
async function saveNotes() {
    if (!userId) return;
    
    // Capturar dados da página atual
    const inputs = document.querySelectorAll('.notes-input');
    const pageData = [];
    inputs.forEach(input => {
        pageData.push(input.value);
    });
    
    // Atualizar estrutura de dados
    if (!notesData[userId]) {
        notesData[userId] = {};
    }
    notesData[userId][currentNotesPage] = pageData;
    
    // Salvar no servidor
    try {
        await fetch(`${API_URL}/save-notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId, 
                notes: notesData[userId] 
            })
        });
    } catch (error) {
        console.error('Erro ao salvar anotações:', error);
    }
}

// Renderizar página de anotações
function renderNotesPage(pageNumber) {
    const container = document.getElementById('notes-page-container');
    const pageNumberDisplay = document.getElementById('current-page-number');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    
    // Atualizar número da página
    pageNumberDisplay.textContent = pageNumber;
    currentNotesPage = pageNumber;
    
    // Obter dados da página
    const pageData = (notesData[userId] && notesData[userId][pageNumber]) || ['', '', '', '', ''];
    
    // Renderizar linhas
    container.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const line = document.createElement('div');
        line.className = 'notes-line';
        line.innerHTML = `<input type="text" class="notes-input" data-page="${pageNumber}" data-line="${i + 1}" value="${pageData[i] || ''}" placeholder="">`;
        container.appendChild(line);
    }
    
    // Controlar visibilidade dos botões
    if (pageNumber === 1) {
        prevBtn.style.visibility = 'hidden';
    } else {
        prevBtn.style.visibility = 'visible';
    }
    
    // Verificar se há próxima página com conteúdo
    const hasNextPage = notesData[userId] && notesData[userId][pageNumber + 1] && 
                        notesData[userId][pageNumber + 1].some(line => line && line.trim() !== '');
    
    // Sempre mostrar botão próxima página
    nextBtn.style.visibility = 'visible';
}

// Próxima página
function nextNotesPage() {
    saveNotes(); // Salvar antes de trocar
    renderNotesPage(currentNotesPage + 1);
}

// Página anterior
function previousNotesPage() {
    if (currentNotesPage > 1) {
        saveNotes(); // Salvar antes de trocar
        renderNotesPage(currentNotesPage - 1);
    }
}

// Atualizar gráfico de rosca de subcategorias de receitas
function updateSubcategoriasReceitasChart() {
    const canvas = document.getElementById('subcategorias-receitas-chart');
    if (!canvas || !window.userId) return;

    const ctx = canvas.getContext('2d');

    // Buscar transações
    fetch(`${API_URL}/transactions/${window.userId}`)
    .then(response => response.json())
    .then(allTransactions => {
        let filteredTransactions;

        if (window.accumulatedMonths > 0) {
            // Modo acumulado: filtrar últimos X meses
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth() - window.accumulatedMonths + 1, 1);
            filteredTransactions = allTransactions.filter(trans => {
                const transDate = new Date(trans.data);
                return transDate >= startDate && trans.type === 'receitas' && trans.status === 'Recebido';
            });
        } else {
            // Modo mês atual - usar mesReferencia para sincronizar com "Minhas Finanças"
            const year = window.currentMonth.getFullYear();
            const month = String(window.currentMonth.getMonth() + 1).padStart(2, '0');
            const mesReferencia = `${year}-${month}`;
            
            filteredTransactions = allTransactions.filter(trans => {
                return trans.mesReferencia === mesReferencia && trans.type === 'receitas' && trans.status === 'Recebido';
            });
        }

        // Coletar dados das subcategorias
        const subcategorias = {};
        let total = 0;

        filteredTransactions.forEach(trans => {
            const subcategoria = trans.subcategoria || 'Sem subcategoria';
            const valor = parseCurrency(trans.valor);
            
            if (valor > 0 && subcategoria !== 'Selecione uma subcategoria' && subcategoria !== '') {
                subcategorias[subcategoria] = (subcategorias[subcategoria] || 0) + valor;
                total += valor;
            }
        });

    // Destruir gráfico anterior
    if (subcategoriasReceitasChart) {
        subcategoriasReceitasChart.destroy();
    }

    // Preparar dados
    const labels = Object.keys(subcategorias);
    const data = Object.values(subcategorias);

    // Verificar se há dados
    const chartContainer = canvas.parentElement;
    let noDataMessage = chartContainer.querySelector('.no-data-message');

    if (labels.length === 0) {
        // Ocultar canvas e mostrar mensagem
        canvas.style.display = 'none';
        if (!noDataMessage) {
            noDataMessage = document.createElement('div');
            noDataMessage.className = 'no-data-message';
            noDataMessage.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--color-text-secondary);">
                    <p style="margin: 0; font-size: 16px;">Assim que você fizer suas lançamentos, o gráfico aparecerá.</p>
                    <p style="margin: 10px 0 0 0; font-size: 14px;">Não está aparecendo pois não há lançamentos.</p>
                </div>
            `;
            chartContainer.appendChild(noDataMessage);
        } else {
            noDataMessage.style.display = 'block';
        }
        return;
    } else {
        // Mostrar canvas e ocultar mensagem
        canvas.style.display = 'block';
        if (noDataMessage) {
            noDataMessage.style.display = 'none';
        }
    }

    const chartColors = [
        'rgba(255, 201, 4, 0.13)',   // Tom mais forte
        'rgba(126, 106, 34, 0.13)',
        'rgba(150, 120, 10, 0.7)',
        'rgba(255, 200, 0, 0.6)',
        'rgba(80, 63, 0, 0.5)',
        'rgba(185, 233, 63, 0.4)',
        'rgba(204, 112, 31, 0.3)',
        'rgba(129, 194, 63, 0.25)',
        'rgba(182, 162, 91, 0.2)',
        'rgba(130, 110, 40, 0.15)'   // Tom mais suave  // Tom mais suave
    ];
    const colors = labels.map((_, index) => chartColors[index % chartColors.length]);
    const borderColors = colors.map(color => color.replace(/0\.\d+/, '0.5')); // Bordas com alpha 0.5 para contraste        // Criar novo gráfico
        subcategoriasReceitasChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e1e1e',
                        titleColor: '#fff',
                        bodyColor: '#a0a0a0',
                        borderColor: '#333',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                const value = formatCurrencyValue(context.raw);
                                const percent = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${value} (${percent}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Criar legenda customizada em colunas de 3
        const legendContainer = document.createElement('div');
        legendContainer.className = 'chart-legend';
        legendContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            margin-top: 10px;
            max-width: 100%;
        `;

        labels.forEach((label, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                align-items: center;
                margin: 5px 10px;
                font-size: 11px;
                color: #a0a0a0;
                font-family: Poppins;
                flex: 0 0 auto;
                min-width: 0;
            `;

            const colorBox = document.createElement('div');
            colorBox.style.cssText = `
                width: 12px;
                height: 12px;
                background-color: ${colors[index]};
                border: 1px solid ${borderColors[index]};
                margin-right: 5px;
                border-radius: 2px;
                flex-shrink: 0;
            `;

            item.appendChild(colorBox);
            item.appendChild(document.createTextNode(label));
            legendContainer.appendChild(item);
        });

        const container = canvas.parentElement;
        const existingLegend = container.querySelector('.chart-legend');
        if (existingLegend) existingLegend.remove();
        container.appendChild(legendContainer);
    })
    .catch(error => {
        console.error('Erro ao carregar subcategorias de receitas para gráfico:', error);
    });
}

// Atualizar gráfico de rosca de subcategorias de despesas
function updateSubcategoriasDespesasChart() {
    const canvas = document.getElementById('subcategorias-despesas-chart');
    if (!canvas || !window.userId) return;

    const ctx = canvas.getContext('2d');

    // Buscar transações
    fetch(`${API_URL}/transactions/${window.userId}`)
    .then(response => response.json())
    .then(allTransactions => {
        let filteredTransactions;

        if (window.accumulatedMonths > 0) {
            // Modo acumulado: filtrar últimos X meses
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth() - window.accumulatedMonths + 1, 1);
            filteredTransactions = allTransactions.filter(trans => {
                const transDate = new Date(trans.data);
                return transDate >= startDate && trans.type === 'despesas' && trans.status === 'Pago';
            });
        } else {
            // Modo mês atual - usar mesReferencia para sincronizar com "Minhas Finanças"
            const year = window.currentMonth.getFullYear();
            const month = String(window.currentMonth.getMonth() + 1).padStart(2, '0');
            const mesReferencia = `${year}-${month}`;
            
            filteredTransactions = allTransactions.filter(trans => {
                return trans.mesReferencia === mesReferencia && trans.type === 'despesas' && trans.status === 'Pago';
            });
        }

        // Coletar dados das subcategorias
        const subcategorias = {};
        let total = 0;

        filteredTransactions.forEach(trans => {
            const subcategoria = trans.subcategoria || 'Sem subcategoria';
            const valor = parseCurrency(trans.valor);
            
            if (valor > 0 && subcategoria !== 'Selecione uma subcategoria' && subcategoria !== '') {
                subcategorias[subcategoria] = (subcategorias[subcategoria] || 0) + valor;
                total += valor;
            }
        });

    // Destruir gráfico anterior
    if (subcategoriasDespesasChart) {
        subcategoriasDespesasChart.destroy();
    }

    // Preparar dados
    const labels = Object.keys(subcategorias);
    const data = Object.values(subcategorias);

    // Verificar se há dados
    const chartContainer = canvas.parentElement;
    let noDataMessage = chartContainer.querySelector('.no-data-message');

    if (labels.length === 0) {
        // Ocultar canvas e mostrar mensagem
        canvas.style.display = 'none';
        if (!noDataMessage) {
            noDataMessage = document.createElement('div');
            noDataMessage.className = 'no-data-message';
            noDataMessage.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--color-text-secondary);">
                    <p style="margin: 0; font-size: 16px;">Assim que você fizer suas lançamentos, o gráfico aparecerá.</p>
                    <p style="margin: 10px 0 0 0; font-size: 14px;">Não está aparecendo pois não há lançamentos.</p>
                </div>
            `;
            chartContainer.appendChild(noDataMessage);
        } else {
            noDataMessage.style.display = 'block';
        }
        return;
    } else {
        // Mostrar canvas e ocultar mensagem
        canvas.style.display = 'block';
        if (noDataMessage) {
            noDataMessage.style.display = 'none';
        }
    }

    const chartColors = [
        'rgba(255, 201, 4, 0.13)',   // Tom mais forte
        'rgba(126, 106, 34, 0.13)',
        'rgba(150, 120, 10, 0.7)',
        'rgba(255, 200, 0, 0.6)',
        'rgba(80, 63, 0, 0.5)',
        'rgba(185, 233, 63, 0.4)',
        'rgba(204, 112, 31, 0.3)',
        'rgba(129, 194, 63, 0.25)',
        'rgba(182, 162, 91, 0.2)',
        'rgba(130, 110, 40, 0.15)'   // Tom mais suave   // Tom mais suave
    ];
    const colors = labels.map((_, index) => chartColors[index % chartColors.length]);
    const borderColors = colors.map(color => color.replace(/0\.\d+/, '0.5')); // Bordas com alpha 0.5 para contraste        // Criar novo gráfico
        subcategoriasDespesasChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e1e1e',
                        titleColor: '#fff',
                        bodyColor: '#a0a0a0',
                        borderColor: '#333',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                const value = formatCurrencyValue(context.raw);
                                const percent = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${value} (${percent}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Criar legenda customizada em colunas de 3
        const legendContainer = document.createElement('div');
        legendContainer.className = 'chart-legend';
        legendContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            margin-top: 10px;
            max-width: 100%;
        `;

        labels.forEach((label, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                align-items: center;
                margin: 5px 10px;
                font-size: 11px;
                color: #a0a0a0;
                font-family: Poppins;
                flex: 0 0 auto;
                min-width: 0;
            `;

            const colorBox = document.createElement('div');
            colorBox.style.cssText = `
                width: 12px;
                height: 12px;
                background-color: ${colors[index]};
                border: 1px solid ${borderColors[index]};
                margin-right: 5px;
                border-radius: 2px;
                flex-shrink: 0;
            `;

            item.appendChild(colorBox);
            item.appendChild(document.createTextNode(label));
            legendContainer.appendChild(item);
        });

        const container = canvas.parentElement;
        const existingLegend = container.querySelector('.chart-legend');
        if (existingLegend) existingLegend.remove();
        container.appendChild(legendContainer);
    })
    .catch(error => {
        console.error('Erro ao carregar subcategorias de despesas para gráfico:', error);
    });
}

