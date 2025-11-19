// ==================== FINANCE.JS ====================
// API_URL já está declarada no app.js
// ====================================================

let exampleDataAdded = false;

function updateStatusSelectStyle(select) {
    const value = select.value;
    if (value === 'Recebido' || value === 'Pago') {
        select.style.background = 'rgba(130, 110, 40, 0.13)';
        select.style.color = 'rgb(200, 180, 100)';
        select.style.border = '1px solid rgba(180, 160, 80, 0.214)';
    } else if (value === 'Pendente') {
        select.style.background = 'rgba(40, 120, 90, 0.13)';
        select.style.color = 'rgb(100, 200, 160)';
        select.style.border = '1px solid rgba(80, 180, 140, 0.214)';
    } else if (value === 'Atrasado' || value === 'Vencido') {
        select.style.background = 'rgba(100, 50, 90, 0.13)';
        select.style.color = 'rgb(190, 130, 170)';
        select.style.border = '1px solid rgba(170, 100, 150, 0.214)';
    } else {
        select.style.background = 'rgba(30, 90, 150, 0.13)';
        select.style.color = 'rgb(100, 156, 212)';
        select.style.border = '1px solid rgba(100, 150, 200, 0.214)';
    }
}

function setupStatusSelect(select) {
    select.className = 'status-select';
    select.style.width = '100%';
    select.style.padding = 'var(--spacing-xs)';
    select.style.borderRadius = 'var(--radius-sm)';
    updateStatusSelectStyle(select);
    select.addEventListener('change', function() {
        updateStatusSelectStyle(this);
    });
}

// Funções auxiliares para aplicar cores em categorias e subcategorias carregadas
function setupCategorySelect(select, type) {
    if (select.value) {
        applyCategoryColor(select, select.value, type);
    }
}

function setupSubcategorySelect(select, category, type) {
    if (select.value && category) {
        applySubcategoryColor(select, category, select.value, type);
    }
}

// Função para atualizar subcategorias quando a categoria muda
function updateSubcategoriesOnCategoryChange(categorySelect, subcategorySelect, type) {
    categorySelect.addEventListener('change', () => {
        const newCategory = categorySelect.value;
        
        // Armazenar categoria atual no select para uso posterior
        subcategorySelect.dataset.currentCategory = newCategory;
        
        subcategorySelect.innerHTML = '';
        
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = 'Selecione uma subcategoria';
        subcategorySelect.appendChild(emptyOpt);
        
        const subs = subcategoriesMap[type][newCategory] || [];
        subs.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.textContent = sub;
            subcategorySelect.appendChild(opt);
        });
        
        subcategorySelect.value = '';
        subcategorySelect.style.background = 'var(--color-background)';
        subcategorySelect.style.color = 'var(--color-text-primary)';
        subcategorySelect.style.border = '1px solid var(--color-border)';
    });
    
    // Adicionar listener permanente que usa dataset
    subcategorySelect.addEventListener('change', function() {
        const currentCategory = this.dataset.currentCategory || categorySelect.value;
        if (this.value && currentCategory) {
            applySubcategoryColor(this, currentCategory, this.value, type);
        } else {
            this.style.background = 'var(--color-background)';
            this.style.color = 'var(--color-text-primary)';
            this.style.border = '1px solid var(--color-border)';
        }
    });
    
    // Inicializar dataset
    subcategorySelect.dataset.currentCategory = categorySelect.value;
}

window.currentMonth = new Date();

function sortTable(tableId, criteria) {
    // Adicionar sufixo '-table' se não estiver presente
    const fullTableId = tableId.endsWith('-table') ? tableId : `${tableId}-table`;
    const tbody = document.querySelector(`#${fullTableId} tbody`);
    if (!tbody) return;
    const rows = Array.from(tbody.rows);

    // Determinar índices baseados na tabela
    const isDespesa = fullTableId.includes('despesas');
    const dateIndex = 0;
    const valueIndex = isDespesa ? 5 : 3; // Despesas: valor na coluna 5; Receitas: coluna 3

    rows.sort((a, b) => {
        let aVal, bVal;
        if (criteria.startsWith('date')) {
            // Usar timestamp completo se disponível, senão usar apenas a data
            const aInput = a.cells[dateIndex].querySelector('input');
            const bInput = b.cells[dateIndex].querySelector('input');
            const aTimestamp = aInput.getAttribute('data-timestamp');
            const bTimestamp = bInput.getAttribute('data-timestamp');
            
            if (aTimestamp && bTimestamp) {
                aVal = new Date(aTimestamp);
                bVal = new Date(bTimestamp);
            } else {
                aVal = new Date(aInput.value || '1970-01-01');
                bVal = new Date(bInput.value || '1970-01-01');
            }
        } else if (criteria.startsWith('value')) {
            aVal = parseCurrency(a.cells[valueIndex].querySelector('input').value);
            bVal = parseCurrency(b.cells[valueIndex].querySelector('input').value);
        }

        if (criteria.endsWith('-desc')) {
            return bVal - aVal;
        } else {
            return aVal - bVal;
        }
    });

    rows.forEach(row => tbody.appendChild(row));
}

// Função para atualizar display do mês
function updateMonthDisplay() {
    const options = { year: 'numeric', month: 'long' };
    document.getElementById('current-month-display').textContent = window.currentMonth.toLocaleDateString('pt-BR', options);
}

// Função para mês anterior
function previousMonth() {
    window.currentMonth.setMonth(window.currentMonth.getMonth() - 1);
    updateMonthDisplay();
    loadTransactionsForMonth();
    if (typeof updateFullDashboard === 'function') {
        updateFullDashboard();
    }
}

// Função para mês próximo
function nextMonth() {
    window.currentMonth.setMonth(window.currentMonth.getMonth() + 1);
    updateMonthDisplay();
    loadTransactionsForMonth();
    if (typeof updateFullDashboard === 'function') {
        updateFullDashboard();
    }
}

async function loadTransactionsForMonth() {
    try {
        // Formatar mês de referência (YYYY-MM)
        const year = window.currentMonth.getFullYear();
        const month = String(window.currentMonth.getMonth() + 1).padStart(2, '0');
        const mesReferencia = `${year}-${month}`;
        
        console.log('📅 Carregando transações para mês:', mesReferencia);
        
        const response = await fetch(`${API_URL}/transactions/${userId}?mesReferencia=${mesReferencia}`);
        const allTransactions = await response.json();
        
        console.log(`📦 Recebidas ${allTransactions.length} transações do mês ${mesReferencia}`);

        // Não precisa mais filtrar por mês, pois o servidor já retorna filtrado
        const monthTransactions = allTransactions;

        // Limpar tabelas
        ['receitas-recorrentes', 'receitas-variaveis', 'despesas-fixas', 'despesas-variaveis'].forEach(tableType => {
            const tbody = document.getElementById(`${tableType}-table`).querySelector('tbody');
            tbody.innerHTML = '';
        });

        // Adicionar transações filtradas
        monthTransactions.forEach(trans => {
            const tableType = trans.type === 'receitas' ? (trans.subType === 'recorrente' ? 'receitas-recorrentes' : 'receitas-variaveis') : (trans.subType === 'fixa' ? 'despesas-fixas' : 'despesas-variaveis');
            const table = document.getElementById(`${tableType}-table`).querySelector('tbody');
            const row = table.insertRow();

            if (tableType === 'receitas-recorrentes') {
                row.innerHTML = `
                    <td><input type="date" value="${trans.data.split('T')[0]}"></td>
                    <td><select>
                        <option value="">Selecione</option>
                        <option value="Recebido" ${trans.status === 'Recebido' ? 'selected' : ''}>Recebido</option>
                        <option value="Pendente" ${trans.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Atrasado" ${trans.status === 'Atrasado' ? 'selected' : ''}>Atrasado</option>
                    </select></td>
                    <td><input type="text" value="${trans.fonteOuDescricao}"></td>
                    <td><input type="text" value="${formatCurrencyValue(trans.valor)}" oninput="formatCurrency(this); updateDashboard();"></td>
                    <td></td>
                    <td></td>
                    <td><input type="text" value="${trans.notas}"></td>
                    <td><button class="btn-delete" onclick="deleteRow(this)">Excluir</button></td>
                `;
                const statusSelect = row.cells[1].querySelector('select');
                setupStatusSelect(statusSelect);
                // Adicionar timestamp ao input de data
                if (trans.timestamp) {
                    row.cells[0].querySelector('input').setAttribute('data-timestamp', trans.timestamp);
                }
                
                const categoryCell = row.cells[4];
                const categorySelect = createCategorySelect('receitas');
                categorySelect.value = trans.categoria || '';
                categoryCell.appendChild(categorySelect);
                setupCategorySelect(categorySelect, 'receitas');
                
                const subcategoryCell = row.cells[5];
                const subcategorySelect = createSubcategorySelect(trans.categoria, 'receitas');
                subcategorySelect.value = trans.subcategoria || '';
                subcategorySelect.dataset.currentCategory = trans.categoria || '';
                subcategoryCell.appendChild(subcategorySelect);
                setupSubcategorySelect(subcategorySelect, trans.categoria, 'receitas');
                
                updateSubcategoriesOnCategoryChange(categorySelect, subcategorySelect, 'receitas');
                
                // Adicionar auto-save listeners para linhas carregadas
                addAutoSaveListeners(tableType, row);
            } else if (tableType === 'receitas-variaveis') {
                row.innerHTML = `
                    <td><input type="date" value="${trans.data.split('T')[0]}"></td>
                    <td><select>
                        <option value="">Selecione</option>
                        <option value="Recebido" ${trans.status === 'Recebido' ? 'selected' : ''}>Recebido</option>
                        <option value="Pendente" ${trans.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Atrasado" ${trans.status === 'Atrasado' ? 'selected' : ''}>Atrasado</option>
                    </select></td>
                    <td><input type="text" value="${trans.fonteOuDescricao}"></td>
                    <td><input type="text" value="${formatCurrencyValue(trans.valor)}" oninput="formatCurrency(this); updateDashboard();"></td>
                    <td></td>
                    <td></td>
                    <td><input type="text" value="${trans.notas}"></td>
                    <td><button class="btn-delete" onclick="deleteRow(this)">Excluir</button></td>
                `;
                const statusSelect = row.cells[1].querySelector('select');
                setupStatusSelect(statusSelect);
                // Adicionar timestamp ao input de data
                if (trans.timestamp) {
                    row.cells[0].querySelector('input').setAttribute('data-timestamp', trans.timestamp);
                }
                
                const categoryCell = row.cells[4];
                const categorySelect = createCategorySelect('receitas');
                categorySelect.value = trans.categoria || '';
                categoryCell.appendChild(categorySelect);
                setupCategorySelect(categorySelect, 'receitas');
                
                const subcategoryCell = row.cells[5];
                const subcategorySelect = createSubcategorySelect(trans.categoria, 'receitas');
                subcategorySelect.value = trans.subcategoria || '';
                subcategorySelect.dataset.currentCategory = trans.categoria || '';
                subcategoryCell.appendChild(subcategorySelect);
                setupSubcategorySelect(subcategorySelect, trans.categoria, 'receitas');
                
                updateSubcategoriesOnCategoryChange(categorySelect, subcategorySelect, 'receitas');
                
                // Adicionar auto-save listeners para linhas carregadas
                addAutoSaveListeners(tableType, row);
            } else if (tableType === 'despesas-fixas') {
                row.innerHTML = `
                    <td><input type="date" value="${trans.data.split('T')[0]}"></td>
                    <td><select>
                        <option value="">Selecione</option>
                        <option value="Pago" ${trans.status === 'Pago' ? 'selected' : ''}>Pago</option>
                        <option value="Pendente" ${trans.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Vencido" ${trans.status === 'Vencido' ? 'selected' : ''}>Vencido</option>
                    </select></td>
                    <td><input type="text" value="${trans.fonteOuDescricao}"></td>
                    <td></td>
                    <td></td>
                    <td><input type="text" value="${formatCurrencyValue(trans.valor)}" oninput="formatCurrency(this); updateDashboard();"></td>
                    <td><select>
                        <option value="pix" ${trans.metodo === 'pix' ? 'selected' : ''}>Pix</option>
                        <option value="dinheiro" ${trans.metodo === 'dinheiro' ? 'selected' : ''}>Dinheiro</option>
                        <option value="cartão débito" ${trans.metodo === 'cartão débito' ? 'selected' : ''}>Cartão Débito</option>
                        <option value="cartão crédito" ${trans.metodo === 'cartão crédito' ? 'selected' : ''}>Cartão Crédito</option>
                    </select></td>
                    <td><input type="text" value="${trans.notas}"></td>
                    <td><button class="btn-delete" onclick="deleteRow(this)">Excluir</button></td>
                `;
                const statusSelect = row.cells[1].querySelector('select');
                setupStatusSelect(statusSelect);
                // Adicionar timestamp ao input de data
                if (trans.timestamp) {
                    row.cells[0].querySelector('input').setAttribute('data-timestamp', trans.timestamp);
                }
                
                const categoryCell = row.cells[3];
                const categorySelect = createCategorySelect('despesas');
                categorySelect.value = trans.categoria || '';
                categoryCell.appendChild(categorySelect);
                setupCategorySelect(categorySelect, 'despesas');
                
                const subcategoryCell = row.cells[4];
                const subcategorySelect = createSubcategorySelect(trans.categoria, 'despesas');
                subcategorySelect.value = trans.subcategoria || '';
                subcategorySelect.dataset.currentCategory = trans.categoria || '';
                subcategoryCell.appendChild(subcategorySelect);
                setupSubcategorySelect(subcategorySelect, trans.categoria, 'despesas');
                
                updateSubcategoriesOnCategoryChange(categorySelect, subcategorySelect, 'despesas');
                
                // Adicionar auto-save listeners para linhas carregadas
                addAutoSaveListeners(tableType, row);
            } else if (tableType === 'despesas-variaveis') {
                row.innerHTML = `
                    <td><input type="date" value="${trans.data.split('T')[0]}"></td>
                    <td><select>
                        <option value="">Selecione</option>
                        <option value="Pago" ${trans.status === 'Pago' ? 'selected' : ''}>Pago</option>
                        <option value="Pendente" ${trans.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Vencido" ${trans.status === 'Vencido' ? 'selected' : ''}>Vencido</option>
                    </select></td>
                    <td><input type="text" value="${trans.fonteOuDescricao}"></td>
                    <td></td>
                    <td></td>
                    <td><input type="text" value="${formatCurrencyValue(trans.valor)}" oninput="formatCurrency(this); updateDashboard();"></td>
                    <td><select>
                        <option value="pix" ${trans.metodo === 'pix' ? 'selected' : ''}>Pix</option>
                        <option value="dinheiro" ${trans.metodo === 'dinheiro' ? 'selected' : ''}>Dinheiro</option>
                        <option value="cartão débito" ${trans.metodo === 'cartão débito' ? 'selected' : ''}>Cartão Débito</option>
                        <option value="cartão crédito" ${trans.metodo === 'cartão crédito' ? 'selected' : ''}>Cartão Crédito</option>
                    </select></td>
                    <td><input type="text" value="${trans.notas}"></td>
                    <td><button class="btn-delete" onclick="deleteRow(this)">Excluir</button></td>
                `;
                const statusSelect = row.cells[1].querySelector('select');
                setupStatusSelect(statusSelect);
                // Adicionar timestamp ao input de data
                if (trans.timestamp) {
                    row.cells[0].querySelector('input').setAttribute('data-timestamp', trans.timestamp);
                }
                
                const categoryCell = row.cells[3];
                const categorySelect = createCategorySelect('despesas');
                categorySelect.value = trans.categoria || '';
                categoryCell.appendChild(categorySelect);
                setupCategorySelect(categorySelect, 'despesas');
                
                const subcategoryCell = row.cells[4];
                const subcategorySelect = createSubcategorySelect(trans.categoria, 'despesas');
                subcategorySelect.value = trans.subcategoria || '';
                subcategorySelect.dataset.currentCategory = trans.categoria || '';
                subcategoryCell.appendChild(subcategorySelect);
                setupSubcategorySelect(subcategorySelect, trans.categoria, 'despesas');
                
                updateSubcategoriesOnCategoryChange(categorySelect, subcategorySelect, 'despesas');
                
                // Adicionar auto-save listeners para linhas carregadas
                addAutoSaveListeners(tableType, row);
            }

            // Setar ID da linha
            if (trans.id || trans._id) {
                row.dataset.id = trans.id || trans._id;
            }
        });


        // Adicionar linhas vazias se necessário
        const tables = ['receitas-recorrentes', 'receitas-variaveis', 'despesas-fixas', 'despesas-variaveis'];
        tables.forEach(tableType => {
            const tbody = document.getElementById(`${tableType}-table`).querySelector('tbody');
            const isReceita = tableType.startsWith('receitas');
            let emptyCount = 0;
            
            // Contar linhas vazias usando os mesmos critérios da IA:
            // 1. Descrição vazia (coluna 2)
            // 2. Categoria com valor "Selecione uma categoria" (coluna 4 para receitas, coluna 3 para despesas)
            for (let i = 0; i < tbody.rows.length; i++) {
                const row = tbody.rows[i];
                const descricaoInput = row.cells[2]?.querySelector('input');
                const categoriaSelect = isReceita ? row.cells[4]?.querySelector('select') : row.cells[3]?.querySelector('select');
                
                const descricaoVazia = descricaoInput && descricaoInput.value.trim() === '';
                const categoriaPadrao = categoriaSelect && categoriaSelect.value === 'Selecione uma categoria';
                
                if (descricaoVazia && categoriaPadrao) emptyCount++;
            }
            
            // Adicionar linhas vazias até chegar a 3
            const toAdd = Math.max(0, 3 - emptyCount);
            for (let i = 0; i < toAdd; i++) {
                addRow(tableType);
            }
        });

        tables.forEach(tableType => {
            sortTable(`${tableType}-table`, 'date-desc');
        });

        updateDashboard();
    } catch (error) {
        console.error('Erro ao carregar transações do mês:', error);
    }
}


async function initializeFinances() {
    updateMonthDisplay(); // Atualizar display do mês
    await loadTransactionsForMonth(); // Carregar do mês atual
    collectCategoriesReceitas();
    collectCategoriesDespesas();
    updateDashboard();
}

// Nova função para verificar se há transações
function checkIfHasTransactions() {
    const receitaRecorrenteRows = document.querySelectorAll('#receitas-recorrentes-table tbody tr');
    const receitaVariavelRows = document.querySelectorAll('#receitas-variaveis-table tbody tr');
    const despesaFixaRows = document.querySelectorAll('#despesas-fixas-table tbody tr');
    const despesaVariavelRows = document.querySelectorAll('#despesas-variaveis-table tbody tr');
    
    return receitaRecorrenteRows.length > 0 || 
           receitaVariavelRows.length > 0 || 
           despesaFixaRows.length > 0 || 
           despesaVariavelRows.length > 0;
}

// Função removida: lancarReceitasRecorrentes (não mais necessária sem 'Dia Lançamento')

// Função para adicionar dados fictícios de exemplo (atualizada para separar)
function addExampleData() {
    const receitaRecorrenteTable = document.getElementById('receitas-recorrentes-table').querySelector('tbody');
    const receitaVariavelTable = document.getElementById('receitas-variaveis-table').querySelector('tbody');
    const despesaFixaTable = document.getElementById('despesas-fixas-table').querySelector('tbody');
    const despesaVariavelTable = document.getElementById('despesas-variaveis-table').querySelector('tbody');

    // Adicionar exemplos recorrentes
    const recorrentesExemplo = [
        { data: '2023-10-01', fonte: 'Salário', valor: 'R$ 5.000,00', categoria: 'Salário e Rendimentos do Trabalho', subcategoria: 'Salário fixo', notas: 'Pagamento mensal' },
        { data: '2023-10-05', fonte: 'Freelance regular', valor: 'R$ 1.200,00', categoria: 'Salário e Rendimentos do Trabalho', subcategoria: 'Freelance', notas: 'Mensal' },
        { data: '2023-10-10', fonte: 'Aluguel recebido', valor: 'R$ 800,00', categoria: 'Renda de Aluguéis', subcategoria: 'Aluguel de imóvel residencial', notas: 'Mensal' }
    ];

    recorrentesExemplo.forEach(rec => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="date" value="${rec.data}"></td>
            <td><input type="text" value="${rec.fonte}"></td>
            <td><input type="text" value="${rec.valor}" oninput="formatCurrency(this)"></td>
            <td></td>
            <td></td>
            <td><input type="text" value="${rec.notas}"></td>
            <td><button class="delete-button" onclick="deleteRow(this)">Excluir</button></td>
        `;
        const categoryCell = row.cells[3];
        const categorySelect = createCategorySelect('receitas');
        categorySelect.value = rec.categoria;
        categoryCell.appendChild(categorySelect);
        const subcategoryCell = row.cells[4];
        const subcategorySelect = createSubcategorySelect(rec.categoria, 'receitas');
        subcategorySelect.value = rec.subcategoria;
        subcategoryCell.appendChild(subcategorySelect);
        categorySelect.addEventListener('change', () => {
            subcategorySelect.innerHTML = '';
            const subs = subcategoriesMap.receitas[categorySelect.value] || [];
            subs.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                subcategorySelect.appendChild(opt);
            });
        });
        receitaRecorrenteTable.appendChild(row);
    });

    // Adicionar exemplos variáveis
    const variaveisExemplo = [
        { data: '2023-10-15', fonte: 'Bônus', valor: 'R$ 2.000,00', categoria: 'Salário e Rendimentos do Trabalho', subcategoria: 'Bônus e comissões', notas: 'Bônus anual' },
        { data: '2023-10-20', fonte: 'Venda eventual', valor: 'R$ 500,00', categoria: 'Renda de Empreendimentos', subcategoria: 'Venda de produtos', notas: 'Produto vendido' }
    ];

    variaveisExemplo.forEach(rec => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="date" value="${rec.data}"></td>
            <td><input type="text" value="${rec.fonte}"></td>
            <td><input type="text" value="${rec.valor}" oninput="formatCurrency(this)"></td>
            <td></td>
            <td></td>
            <td><input type="text" value="${rec.notas}"></td>
            <td><button onclick="deleteRow(this)">Excluir</button></td>
        `;
        const categoryCell = row.cells[3];
        const categorySelect = createCategorySelect('receitas');
        categorySelect.value = rec.categoria;
        categoryCell.appendChild(categorySelect);
        const subcategoryCell = row.cells[4];
        const subcategorySelect = createSubcategorySelect(rec.categoria, 'receitas');
        subcategorySelect.value = rec.subcategoria;
        subcategoryCell.appendChild(subcategorySelect);
        categorySelect.addEventListener('change', () => {
            subcategorySelect.innerHTML = '';
            const subs = subcategoriesMap.receitas[categorySelect.value] || [];
            subs.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                subcategorySelect.appendChild(opt);
            });
        });
        receitaVariavelTable.appendChild(row);
    });

    // Adicionar exemplos despesas fixas
    const fixasExemplo = [
        { data: '2023-10-01', descricao: 'Aluguel', categoria: 'Moradia', subcategoria: 'Aluguel', valor: 'R$ 1.500,00', metodo: 'pix', notas: 'Mensal' },
        { data: '2023-10-05', descricao: 'Internet', categoria: 'Moradia', subcategoria: 'Internet residencial', valor: 'R$ 100,00', metodo: 'cartão crédito', notas: 'Mensal' },
        { data: '2023-10-10', descricao: 'Transporte fixo', categoria: 'Transporte', subcategoria: 'Financiamento de veículo', valor: 'R$ 300,00', metodo: 'pix', notas: 'Prestação carro' }
    ];

    fixasExemplo.forEach(desp => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="date" value="${desp.data}"></td>
            <td><input type="text" value="${desp.descricao}"></td>
            <td></td>
            <td></td>
            <td><input type="text" value="${desp.valor}" oninput="formatCurrency(this)"></td>
            <td><select>
                <option value="pix" ${desp.metodo === 'pix' ? 'selected' : ''}>Pix</option>
                <option value="dinheiro" ${desp.metodo === 'dinheiro' ? 'selected' : ''}>Dinheiro</option>
                <option value="cartão débito" ${desp.metodo === 'cartão débito' ? 'selected' : ''}>Cartão Débito</option>
                <option value="cartão crédito" ${desp.metodo === 'cartão crédito' ? 'selected' : ''}>Cartão Crédito</option>
            </select></td>
            <td><input type="text" value="${desp.notas}"></td>
            <td><button onclick="deleteRow(this)">Excluir</button></td>
        `;
        const categoryCell = row.cells[2];
        const categorySelect = createCategorySelect('despesas');
        categorySelect.value = desp.categoria;
        categoryCell.appendChild(categorySelect);
        const subcategoryCell = row.cells[3];
        const subcategorySelect = createSubcategorySelect(desp.categoria, 'despesas');
        subcategorySelect.value = desp.subcategoria;
        subcategoryCell.appendChild(subcategorySelect);
        categorySelect.addEventListener('change', () => {
            subcategorySelect.innerHTML = '';
            const subs = subcategoriesMap.despesas[categorySelect.value] || [];
            subs.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                subcategorySelect.appendChild(opt);
            });
        });
        despesaFixaTable.appendChild(row);
    });

    // Adicionar exemplos despesas variáveis
    const variaveisDespExemplo = [
        { data: '2023-10-02', descricao: 'Supermercado', categoria: 'Alimentação', subcategoria: 'Supermercado', valor: 'R$ 600,00', metodo: 'cartão débito', notas: 'Compras semanais' },
        { data: '2023-10-03', descricao: 'Combustível', categoria: 'Transporte', subcategoria: 'Combustível', valor: 'R$ 200,00', metodo: 'pix', notas: 'Abastecimento' },
        { data: '2023-10-04', descricao: 'Roupas', categoria: 'Vestuário e Cuidados Pessoais', subcategoria: 'Roupas', valor: 'R$ 150,00', metodo: 'dinheiro', notas: 'Básicas' }
    ];

    variaveisDespExemplo.forEach(desp => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="date" value="${desp.data}"></td>
            <td><input type="text" value="${desp.descricao}"></td>
            <td></td>
            <td></td>
            <td><input type="text" value="${desp.valor}" oninput="formatCurrency(this)"></td>
            <td><select>
                <option value="pix" ${desp.metodo === 'pix' ? 'selected' : ''}>Pix</option>
                <option value="dinheiro" ${desp.metodo === 'dinheiro' ? 'selected' : ''}>Dinheiro</option>
                <option value="cartão débito" ${desp.metodo === 'cartão débito' ? 'selected' : ''}>Cartão Débito</option>
                <option value="cartão crédito" ${desp.metodo === 'cartão crédito' ? 'selected' : ''}>Cartão Crédito</option>
            </select></td>
            <td><input type="text" value="${desp.notas}"></td>
            <td><button onclick="deleteRow(this)">Excluir</button></td>
        `;
        const categoryCell = row.cells[2];
        const categorySelect = createCategorySelect('despesas');
        categorySelect.value = desp.categoria;
        categoryCell.appendChild(categorySelect);
        const subcategoryCell = row.cells[3];
        const subcategorySelect = createSubcategorySelect(desp.categoria, 'despesas');
        subcategorySelect.value = desp.subcategoria;
        subcategoryCell.appendChild(subcategorySelect);
        categorySelect.addEventListener('change', () => {
            subcategorySelect.innerHTML = '';
            const subs = subcategoriesMap.despesas[categorySelect.value] || [];
            subs.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                subcategorySelect.appendChild(opt);
            });
        });
        despesaVariavelTable.appendChild(row);
    });

    updateDashboard(); // Atualizar dashboard com os exemplos
}

function updateDashboard() {
    // Calcular mês de referência atual
    const year = window.currentMonth.getFullYear();
    const month = String(window.currentMonth.getMonth() + 1).padStart(2, '0');
    const mesReferenciaAtual = `${year}-${month}`;
    
    console.log('💰 Calculando saldo até o mês:', mesReferenciaAtual);
    
    // Buscar TODAS as transações do usuário
    fetch(`${API_URL}/transactions/${userId}`)
    .then(response => response.json())
    .then(allTransactions => {
        // Filtrar transações do MÊS ATUAL (para receitas/despesas)
        const transacoesMesAtual = allTransactions.filter(trans => {
            return trans.mesReferencia === mesReferenciaAtual;
        });
        
        // Filtrar transações até o mês atual (para SALDO acumulado)
        const transacoesAteAgora = allTransactions.filter(trans => {
            return trans.mesReferencia && trans.mesReferencia <= mesReferenciaAtual;
        });
        
        console.log(`📊 Transações do mês ${mesReferenciaAtual}:`, transacoesMesAtual.length);
        console.log(`📊 Transações acumuladas até ${mesReferenciaAtual}:`, transacoesAteAgora.length);
        
        // Calcular receitas/despesas do MÊS ATUAL (APENAS RECEBIDO/PAGO)
        let receitasMesAtual = 0;
        let despesasMesAtual = 0;
        let receitasPendentes = 0;  // Pendente + Atrasado
        let despesasPendentes = 0;  // Pendente + Vencido
        
        transacoesMesAtual.forEach(trans => {
            const valor = parseCurrency(trans.valor);
            if (trans.type === 'receitas') {
                if (trans.status === 'Recebido') {
                    receitasMesAtual += valor;
                } else if (trans.status === 'Pendente' || trans.status === 'Atrasado') {
                    receitasPendentes += valor;
                }
            } else if (trans.type === 'despesas') {
                if (trans.status === 'Pago') {
                    despesasMesAtual += valor;
                } else if (trans.status === 'Pendente' || trans.status === 'Vencido') {
                    despesasPendentes += valor;
                }
            }
        });
        
        // Calcular saldo ACUMULADO (passado + presente) - APENAS RECEBIDO/PAGO
        let receitasAcumuladas = 0;
        let despesasAcumuladas = 0;
        
        transacoesAteAgora.forEach(trans => {
            const valor = parseCurrency(trans.valor);
            if (trans.type === 'receitas' && trans.status === 'Recebido') {
                receitasAcumuladas += valor;
            } else if (trans.type === 'despesas' && trans.status === 'Pago') {
                despesasAcumuladas += valor;
            }
        });
        
        const saldoAcumulado = receitasAcumuladas - despesasAcumuladas;
        
        console.log('💵 Receitas do mês atual (Recebido):', formatCurrencyValue(receitasMesAtual));
        console.log('💸 Despesas do mês atual (Pago):', formatCurrencyValue(despesasMesAtual));
        console.log('⏳ Receitas pendentes:', formatCurrencyValue(receitasPendentes));
        console.log('⏳ Despesas pendentes:', formatCurrencyValue(despesasPendentes));
        console.log('📈 Saldo acumulado (transações):', formatCurrencyValue(saldoAcumulado));

        // Buscar saldo da conta do perfil (SEMPRE incluir)
        fetch(`${API_URL}/profile/${userId}`)
        .then(response => response.json())
        .then(profile => {
            const saldoConta = parseCurrency(profile.financeira?.saldoConta || '0');
            const saldoLiquido = saldoAcumulado + saldoConta;
            
            console.log('🏦 Saldo da conta (perfil):', formatCurrencyValue(saldoConta));
            console.log('✅ Saldo líquido final:', formatCurrencyValue(saldoLiquido));

            document.getElementById('saldo-liquido').textContent = formatCurrencyValue(saldoLiquido);
            document.getElementById('total-receitas').textContent = formatCurrencyValue(receitasMesAtual);
            document.getElementById('total-despesas').textContent = formatCurrencyValue(despesasMesAtual);
            document.getElementById('receitas-pendentes').textContent = formatCurrencyValue(receitasPendentes);
            document.getElementById('despesas-pendentes').textContent = formatCurrencyValue(despesasPendentes);
        })
        .catch(error => {
            console.error('Erro ao carregar perfil para dashboard:', error);
            // Fallback sem saldo da conta
            document.getElementById('saldo-liquido').textContent = formatCurrencyValue(saldoAcumulado);
            document.getElementById('total-receitas').textContent = formatCurrencyValue(receitasMesAtual);
            document.getElementById('total-despesas').textContent = formatCurrencyValue(despesasMesAtual);
            document.getElementById('receitas-pendentes').textContent = formatCurrencyValue(receitasPendentes);
            document.getElementById('despesas-pendentes').textContent = formatCurrencyValue(despesasPendentes);
        });
    })
    .catch(error => {
        console.error('Erro ao carregar transações:', error);
    });
    
    // Atualizar dashboard completo se a função existir
    if (typeof updateDashboardSummary === 'function') {
        updateDashboardSummary();
        updateReceitasCategorias();
        updateDespesasCategorias();
        updateDistributionChart();
        updateSubcategoriasReceitasChart();
        updateSubcategoriasDespesasChart();
    }
}

// Funções para as planilhas (atualizada para receitas recorrentes/variáveis e despesas fixas/variáveis)
function addRow(tableType) {
    const today = new Date().toISOString().split('T')[0];
    const table = document.getElementById(`${tableType}-table`).querySelector('tbody');
    const row = table.insertRow();

    if (tableType === 'receitas-recorrentes') {
        row.innerHTML = `
            <td><input type="date" value="${today}"></td>
            <td><select>
                <option value="">Selecione</option>
                <option value="Recebido">Recebido</option>
                <option value="Pendente">Pendente</option>
                <option value="Atrasado">Atrasado</option>
            </select></td>
            <td><input type="text" placeholder="Fonte"></td>
            <td><input type="text" placeholder="Valor" oninput="formatCurrency(this); updateDashboard();"></td>
            <td></td>
            <td></td>
            <td><input type="text" placeholder="Notas"></td>
            <td><button class="btn-delete" onclick="deleteRow(this)">Excluir</button></td>
        `;
        const statusSelect = row.cells[1].querySelector('select');
        setupStatusSelect(statusSelect);
        
        const categoryCell = row.cells[4];
        const categorySelect = createCategorySelect('receitas');
        categoryCell.appendChild(categorySelect);
        const subcategoryCell = row.cells[5];
        const subcategorySelect = createSubcategorySelect(categorySelect.value, 'receitas');
        subcategoryCell.appendChild(subcategorySelect);
        
        updateSubcategoriesOnCategoryChange(categorySelect, subcategorySelect, 'receitas');
        
        // Adicionar auto-save listeners
        addAutoSaveListeners(tableType, row);
    } else if (tableType === 'receitas-variaveis') {
        row.innerHTML = `
            <td><input type="date" value="${today}"></td>
            <td><select>
                <option value="">Selecione</option>
                <option value="Recebido">Recebido</option>
                <option value="Pendente">Pendente</option>
                <option value="Atrasado">Atrasado</option>
            </select></td>
            <td><input type="text" placeholder="Fonte"></td>
            <td><input type="text" placeholder="Valor" oninput="formatCurrency(this); updateDashboard();"></td>
            <td></td>
            <td></td>
            <td><input type="text" placeholder="Notas"></td>
            <td><button class="btn-delete" onclick="deleteRow(this)">Excluir</button></td>
        `;
        
        const statusSelect = row.cells[1].querySelector('select');
        setupStatusSelect(statusSelect);
        
        const categoryCell = row.cells[4];
        const categorySelect = createCategorySelect('receitas');
        categoryCell.appendChild(categorySelect);
        const subcategoryCell = row.cells[5];
        const subcategorySelect = createSubcategorySelect(categorySelect.value, 'receitas');
        subcategoryCell.appendChild(subcategorySelect);
        
        updateSubcategoriesOnCategoryChange(categorySelect, subcategorySelect, 'receitas');
        
        // Adicionar auto-save listeners
        addAutoSaveListeners(tableType, row);
    } else if (tableType === 'despesas-fixas') {
        row.innerHTML = `
            <td><input type="date" value="${today}"></td>
            <td><select>
                <option value="">Selecione</option>
                <option value="Pago">Pago</option>
                <option value="Pendente">Pendente</option>
                <option value="Vencido">Vencido</option>
            </select></td>
            <td><input type="text" placeholder="Descrição"></td>
            <td></td>
            <td></td>
            <td><input type="text" placeholder="Valor" oninput="formatCurrency(this); updateDashboard();"></td>
            <td><select>
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartão débito">Cartão Débito</option>
                <option value="cartão crédito">Cartão Crédito</option>
            </select></td>
            <td><input type="text" placeholder="Notas"></td>
            <td><button class="btn-delete" onclick="deleteRow(this)">Excluir</button></td>
        `;
        
        const statusSelect = row.cells[1].querySelector('select');
        setupStatusSelect(statusSelect);
        
        const categoryCell = row.cells[3];
        const categorySelect = createCategorySelect('despesas');
        categoryCell.appendChild(categorySelect);
        const subcategoryCell = row.cells[4];
        const subcategorySelect = createSubcategorySelect(categorySelect.value, 'despesas');
        subcategoryCell.appendChild(subcategorySelect);
        
        updateSubcategoriesOnCategoryChange(categorySelect, subcategorySelect, 'despesas');
        
        // Adicionar auto-save listeners
        addAutoSaveListeners(tableType, row);
    } else if (tableType === 'despesas-variaveis') {
        row.innerHTML = `
            <td><input type="date" value="${today}"></td>
            <td><select>
                <option value="">Selecione</option>
                <option value="Pago">Pago</option>
                <option value="Pendente">Pendente</option>
                <option value="Vencido">Vencido</option>
            </select></td>
            <td><input type="text" placeholder="Descrição"></td>
            <td></td>
            <td></td>
            <td><input type="text" placeholder="Valor" oninput="formatCurrency(this); updateDashboard();"></td>
            <td><select>
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartão débito">Cartão Débito</option>
                <option value="cartão crédito">Cartão Crédito</option>
            </select></td>
            <td><input type="text" placeholder="Notas"></td>
            <td><button class="btn-delete" onclick="deleteRow(this)">Excluir</button></td>
        `;
        
        const statusSelect = row.cells[1].querySelector('select');
        setupStatusSelect(statusSelect);
        
        const categoryCell = row.cells[3];
        const categorySelect = createCategorySelect('despesas');
        categoryCell.appendChild(categorySelect);
        const subcategoryCell = row.cells[4];
        const subcategorySelect = createSubcategorySelect(categorySelect.value, 'despesas');
        subcategoryCell.appendChild(subcategorySelect);
        
        updateSubcategoriesOnCategoryChange(categorySelect, subcategorySelect, 'despesas');
        
        // Adicionar auto-save listeners
        addAutoSaveListeners(tableType, row);
    }
}

// Função para salvar transação no servidor (atualizada)
function saveTransaction(type, row) {
    const cells = row.cells;
    
    // Adicionar indicador de salvamento
    const saveIndicator = showSaveIndicator(row);
    
    let subType = '';

    if (type === 'receitas-recorrentes') {
        subType = 'recorrente';
    } else if (type === 'receitas-variaveis') {
        subType = 'variavel';
    } else if (type === 'despesas-fixas') {
        subType = 'fixa';
    } else if (type === 'despesas-variaveis') {
        subType = 'variavel';
    }

    const isReceita = type.startsWith('receitas');
    
    // Obter timestamp completo
    const dateInput = cells[0].querySelector('input');
    const dateValue = dateInput ? dateInput.value : '';
    
    // Debug: verificar estrutura da linha
    console.log('📊 DEBUG ESTRUTURA:', {
        tipo: type,
        totalCells: cells.length,
        isReceita: isReceita
    });
    
    const fonteOuDescricaoCell = cells[2];
    const fonteOuDescricao = fonteOuDescricaoCell && fonteOuDescricaoCell.querySelector('input') ? fonteOuDescricaoCell.querySelector('input').value : '';
    
    const valorCell = isReceita ? cells[3] : cells[5];
    const valorInput = valorCell && valorCell.querySelector('input') ? valorCell.querySelector('input').value : '';
    
    const categoriaCell = isReceita ? cells[4] : cells[3];
    const categoria = categoriaCell && categoriaCell.querySelector('select') ? categoriaCell.querySelector('select').value : '';
    
    const statusCell = cells[1];
    const status = statusCell && statusCell.querySelector('select') ? statusCell.querySelector('select').value : '';
    
    console.log('📝 DEBUG VALORES:', {
        dateValue,
        fonteOuDescricao,
        valorInput,
        categoria,
        status
    });
    
    // VALIDAÇÃO: Não salvar se campos essenciais estiverem vazios
    if (!dateValue || !fonteOuDescricao || !valorInput || !categoria) {
        console.log('❌ Transação incompleta, não será salva');
        return;
    }
    
    // Validar valor
    const valorNumerico = parseFloat(valorInput.replace(/[^\d,]/g, '').replace(',', '.'));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
        console.log('❌ Valor inválido, não será salvo:', valorNumerico);
        return;
    }
    
    let timestamp = dateInput.getAttribute('data-timestamp');
    
    // Se não tiver timestamp, criar um novo com a data + hora atual
    if (!timestamp) {
        const [year, month, day] = dateValue.split('-');
        const now = new Date();
        timestamp = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
        dateInput.setAttribute('data-timestamp', timestamp);
    }
    
    const subcategoriaCell = isReceita ? cells[5] : cells[4];
    const subcategoria = subcategoriaCell && subcategoriaCell.querySelector('select') ? subcategoriaCell.querySelector('select').value : '';
    
    const notasCell = isReceita ? cells[6] : cells[7];
    const notas = notasCell && notasCell.querySelector('input') ? notasCell.querySelector('input').value : '';
    
    const metodoCell = !isReceita ? cells[6] : null;
    const metodo = metodoCell && metodoCell.querySelector('select') ? metodoCell.querySelector('select').value : '';
    
    // Calcular mês de referência a partir do window.currentMonth
    const year = window.currentMonth.getFullYear();
    const month = String(window.currentMonth.getMonth() + 1).padStart(2, '0');
    const mesReferencia = `${year}-${month}`;
    
    const transaction = {
        userId,
        type: isReceita ? 'receitas' : 'despesas',
        subType,
        mesReferencia: mesReferencia,
        data: dateValue,
        timestamp: timestamp,
        status: status,
        fonteOuDescricao: fonteOuDescricao,
        valor: valorNumerico,
        categoria: categoria,
        subcategoria: subcategoria,
        metodo: metodo,
        notas: notas
    };
    
    // Verificar se a linha já tem ID (transação existente)
    const existingId = row.dataset.id;
    
    console.log('=== DEBUG SAVE ===');
    console.log('Tipo:', type);
    console.log('ID existente?', existingId);
    console.log('Dados a salvar:', transaction);
    
    if (existingId) {
        // ATUALIZAR transação existente
        console.log('🔄 Atualizando transação:', existingId);
        fetch(`${API_URL}/update-transaction/${existingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        })
        .then(response => {
            console.log('Status da resposta:', response.status);
            return response.json();
        })
        .then(result => {
            console.log('✅ Transação atualizada:', result);
            showSavedIndicator(saveIndicator);
            updateDashboard(); // Atualizar cards em tempo real
        })
        .catch(error => {
            console.error('❌ Erro ao atualizar transação:', error);
            hideSaveIndicator(saveIndicator);
        });
    } else {
        // CRIAR nova transação
        console.log('✨ Criando nova transação');
        fetch(`${API_URL}/save-transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        })
        .then(response => {
            console.log('Status da resposta:', response.status);
            return response.json();
        })
        .then(result => {
            console.log('✅ Transação criada:', result);
            // Salvar ID na linha para futuras atualizações
            if (result.id) {
                row.dataset.id = result.id;
                console.log('💾 ID salvo na linha:', result.id);
            }
            showSavedIndicator(saveIndicator);
            updateDashboard(); // Atualizar cards em tempo real
        })
        .catch(error => {
            console.error('❌ Erro ao salvar transação:', error);
            hideSaveIndicator(saveIndicator);
        });
    }
}

// Funções para indicadores visuais de salvamento
function showSaveIndicator(row) {
    // Remover indicador anterior se existir
    const existing = row.querySelector('.save-indicator');
    if (existing) existing.remove();
    
    // Criar novo indicador
    const indicator = document.createElement('div');
    indicator.className = 'save-indicator saving';
    indicator.innerHTML = '<span class="spinner"></span>';
    indicator.style.cssText = `
        position: absolute;
        right: 45px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 11px;
        color: #888;
        display: flex;
        align-items: center;
        gap: 5px;
        z-index: 10;
    `;
    
    // Adicionar spinner CSS inline
    const style = document.createElement('style');
    style.textContent = `
        .save-indicator .spinner {
            width: 10px;
            height: 10px;
            border: 2px solid #444;
            border-top: 2px solid #888;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .save-indicator.saved {
            color: #4CAF50;
        }
    `;
    if (!document.querySelector('#save-indicator-styles')) {
        style.id = 'save-indicator-styles';
        document.head.appendChild(style);
    }
    
    // Posicionar na linha
    row.style.position = 'relative';
    row.appendChild(indicator);
    
    return indicator;
}

function showSavedIndicator(indicator) {
    if (!indicator) return;
    
    indicator.className = 'save-indicator saved';
    indicator.innerHTML = '✓ Salvo';
    
    // Remover após 2 segundos
    setTimeout(() => {
        hideSaveIndicator(indicator);
    }, 2000);
}

function hideSaveIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.remove();
    }
}

// Função de auto-save com debounce (agora por linha)
function autoSaveTransaction(type, row) {
    // Cada linha tem seu próprio timeout
    if (row.autoSaveTimeout) {
        clearTimeout(row.autoSaveTimeout);
    }
    
    // Agendar novo salvamento após 0.5 segundos de inatividade
    row.autoSaveTimeout = setTimeout(() => {
        saveTransaction(type, row);
        delete row.autoSaveTimeout;
    }, 500);
}

// Função para adicionar event listeners de auto-save a uma linha
function addAutoSaveListeners(type, row) {
    const inputs = row.querySelectorAll('input, select');
    console.log(`🎯 Adicionando listeners para ${type}, total de inputs: ${inputs.length}`);
    
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            console.log(`👉 BLUR em ${input.tagName} (tem ID: ${!!row.dataset.id})`);
            // Se a linha já tem ID (transação existente), sempre atualizar
            if (row.dataset.id) {
                autoSaveTransaction(type, row);
            } else {
                // Nova linha: só salvar se o campo não estiver vazio
                if (input.value && input.value.trim() !== '' && input.value !== 'Selecione') {
                    autoSaveTransaction(type, row);
                }
            }
        });
        
        input.addEventListener('input', () => {
            console.log(`✍️ INPUT em ${input.tagName} (tem ID: ${!!row.dataset.id})`);
            // Para campos de texto
            if (input.type === 'text') {
                // Se já existe, atualizar sempre. Se é novo, só quando tiver conteúdo
                if (row.dataset.id || input.value.trim().length > 0) {
                    autoSaveTransaction(type, row);
                }
            }
        });
        
        input.addEventListener('change', () => {
            console.log(`🔄 CHANGE em ${input.tagName} (valor: ${input.value}, tem ID: ${!!row.dataset.id})`);
            // Para selects e outros inputs com change
            // Se já existe, atualizar sempre. Se é novo, só quando tiver valor válido
            if (row.dataset.id || (input.value && input.value !== 'Selecione')) {
                autoSaveTransaction(type, row);
            }
        });
    });
}

// Função para atualizar barras de progresso
function updateProgressBars() {
    fetch(`${API_URL}/profile/${userId}`)
    .then(response => response.json())
    .then(profile => {
        const objetivos = profile.objetivos || {};
        const fundoMeta = parseFloat(objetivos.fundoEmergencia?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
        const longoMeta = parseFloat(objetivos.valorMetaLongo?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

        const saldoLiquido = parseFloat(document.getElementById('saldo-liquido').textContent.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

        const progressoEmergencia = fundoMeta > 0 ? Math.min((saldoLiquido / fundoMeta) * 100, 100) : 0;
        const progressoLongo = longoMeta > 0 ? Math.min((saldoLiquido / longoMeta) * 100, 100) : 0;

        // Removed: progress bars for minhas-financas are no longer present
        // document.getElementById('progress-emergencia').style.width = progressoEmergencia + '%';
        // document.getElementById('progress-text-emergencia').textContent = `R$ ${saldoLiquido.toFixed(2)} / R$ ${fundoMeta.toFixed(2)}`;

        // document.getElementById('progress-longo').style.width = progressoLongo + '%';
        // document.getElementById('progress-text-longo').textContent = `R$ ${saldoLiquido.toFixed(2)} / R$ ${longoMeta.toFixed(2)}`;
    })
    .catch(error => console.error('Erro ao carregar objetivos:', error));
}

function updateCompactDashboard() {
    const receitaRecorrenteRows = document.querySelectorAll('#receitas-recorrentes-table tbody tr');
    const receitaVariavelRows = document.querySelectorAll('#receitas-variaveis-table tbody tr');
    const despesaFixaRows = document.querySelectorAll('#despesas-fixas-table tbody tr');
    const despesaVariavelRows = document.querySelectorAll('#despesas-variaveis-table tbody tr');

    let totalReceitas = 0;
    let totalDespesas = 0;

    receitaRecorrenteRows.forEach(row => {
        const input = row.cells[2].querySelector('input');
        if (input) {
            const valor = parseCurrency(input.value);
            totalReceitas += valor;
        }
    });

    receitaVariavelRows.forEach(row => {
        const input = row.cells[2].querySelector('input');
        if (input) {
            const valor = parseCurrency(input.value);
            totalReceitas += valor;
        }
    });

    despesaFixaRows.forEach(row => {
        const input = row.cells[4].querySelector('input');
        if (input) {
            const valor = parseCurrency(input.value);
            totalDespesas += valor;
        }
    });

    despesaVariavelRows.forEach(row => {
        const input = row.cells[4].querySelector('input');
        if (input) {
            const valor = parseCurrency(input.value);
            totalDespesas += valor;
        }
    });

    const saldoLiquidoTransacoes = totalReceitas - totalDespesas;

    // Buscar saldo da conta do perfil
    fetch(`${API_URL}/profile/${userId}`)
    .then(response => response.json())
    .then(profile => {
        const saldoConta = parseCurrency(profile.financeira?.saldoConta || '0');
        const saldoLiquido = saldoLiquidoTransacoes + saldoConta;

        document.getElementById('saldo-liquido-compact').textContent = formatCurrencyValue(saldoLiquido);
        document.getElementById('total-receitas-compact').textContent = formatCurrencyValue(totalReceitas);
        document.getElementById('total-despesas-compact').textContent = formatCurrencyValue(totalDespesas);

        const objetivos = profile.objetivos || {};
        const fundoMeta = parseFloat(objetivos.fundoEmergencia?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
        const longoMeta = parseFloat(objetivos.valorMetaLongo?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

        const progressoEmergencia = fundoMeta > 0 ? Math.min((saldoLiquido / fundoMeta) * 100, 100) : 0;
        const progressoLongo = longoMeta > 0 ? Math.min((saldoLiquido / longoMeta) * 100, 100) : 0;

        document.getElementById('progress-emergencia-compact').style.width = progressoEmergencia + '%';
        document.getElementById('progress-longo-compact').style.width = progressoLongo + '%';
    })
    .catch(error => {
        console.error('Erro ao carregar perfil para dashboard compacto:', error);
        // Fallback sem saldo da conta
        document.getElementById('saldo-liquido-compact').textContent = formatCurrencyValue(saldoLiquidoTransacoes);
        document.getElementById('total-receitas-compact').textContent = formatCurrencyValue(totalReceitas);
        document.getElementById('total-despesas-compact').textContent = formatCurrencyValue(totalDespesas);
    });
}

function formatCurrencyValue(value) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    let str = String(value).trim();
    if (/^[Rr]\$/.test(str)) return str;
    // manter sinais, dígitos, ponto e vírgula; normalizar milhar/decimal
    str = str.replace(/[^\d\-,.]/g, '');
    if (str.indexOf(',') > -1 && str.indexOf('.') > -1) {
        str = str.replace(/\./g, '').replace(',', '.'); // e.g. 1.234,56 => 1234.56
    } else {
        str = str.replace(',', '.'); // 1234,56 => 1234.56
    }
    const num = parseFloat(str);
    if (!Number.isFinite(num)) return '';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function deleteRow(button) {
    const row = button.closest('tr');
    const id = row.dataset.id;
    if (id) {
        fetch(`${API_URL}/transaction/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.text())
        .then(result => {
            console.log(result);
            row.remove();
            collectCategoriesReceitas();
            collectCategoriesDespesas();
            updateDashboard();
        })
        .catch(error => console.error('Erro ao deletar transação:', error));
    } else {
        row.remove();
        collectCategoriesReceitas();
        collectCategoriesDespesas();
        updateDashboard();
    }
}

// Funções para o perfil
function saveSection(section) {
    const data = {};
    if (section === 'pessoal') {
        data.nome = document.getElementById('nome').value;
        data.idade = document.getElementById('idade').value;
        data.profissao = document.getElementById('profissao').value;
        data.localizacao = document.getElementById('localizacao').value;
        data.contato = document.getElementById('contato').value;
        data.sobreVoce = document.getElementById('sobre-voce').value;
    } else if (section === 'financeira') {
        data.saldoConta = document.getElementById('saldo-conta').value;
        data.patrimonio = getPatrimonioData();
        data.dependentes = document.getElementById('dependentes').value;
        data.modeloRenda = document.getElementById('modelo-renda').value;
    } else if (section === 'objetivos') {
        data.poupancaMensal = document.getElementById('poupanca-mensal').value;
        data.fundoEmergencia = document.getElementById('fundo-emergencia').value;
        data.prazoEmergencia = document.getElementById('prazo-emergencia').value;
        data.investimentoMensal = document.getElementById('investimento-mensal').value;
        data.metaLongoPrazo = document.getElementById('meta-longo-prazo').value;
        data.valorMetaLongo = document.getElementById('valor-meta-longo').value;
        data.prazoMetaLongo = document.getElementById('prazo-meta-longo').value;
    }

    fetch(`${API_URL}/save-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, section, data })
    })
    .then(response => response.text())
    .then(result => alert(result))
    .catch(error => console.error('Erro ao salvar perfil:', error));
}

async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/profile/${userId}`);
        const profile = await response.json();
        document.getElementById('nome').value = profile.pessoal?.nome || '';
        document.getElementById('idade').value = profile.pessoal?.idade || '';
        document.getElementById('profissao').value = profile.pessoal?.profissao || '';
        document.getElementById('localizacao').value = profile.pessoal?.localizacao || '';
        document.getElementById('contato').value = profile.pessoal?.contato || '';
        document.getElementById('sobre-voce').value = profile.pessoal?.sobreVoce || '';
        document.getElementById('saldo-conta').value = profile.financeira?.saldoConta || '';
        document.getElementById('dependentes').value = profile.financeira?.dependentes || '';
        document.getElementById('modelo-renda').value = profile.financeira?.modeloRenda || '';
        document.getElementById('poupanca-mensal').value = profile.objetivos?.poupancaMensal || '';
        document.getElementById('fundo-emergencia').value = profile.objetivos?.fundoEmergencia || '';
        document.getElementById('prazo-emergencia').value = profile.objetivos?.prazoEmergencia || '';
        document.getElementById('investimento-mensal').value = profile.objetivos?.investimentoMensal || '';
        document.getElementById('meta-longo-prazo').value = profile.objetivos?.metaLongoPrazo || '';
        document.getElementById('valor-meta-longo').value = profile.objetivos?.valorMetaLongo || '';
        document.getElementById('prazo-meta-longo').value = profile.objetivos?.prazoMetaLongo || '';

        // Carregar patrimônio
        loadPatrimonio(profile.financeira?.patrimonio || []);

        // Carregar dívidas
        await loadDividas();
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
    }
}

// Remover event listeners de hover e adicionar para o botão flutuante
document.addEventListener('DOMContentLoaded', () => {
    // Botão flutuante
    document.getElementById('ai-float-btn').addEventListener('click', () => {
        openModal();
    });

    // Event listener para o select de tabela removido - já está implementado em app.js

    // Event listener para o botão de enviar para IA removido - já está implementado em app.js

    // Event listeners do modal de IA removidos - já estão implementados em app.js

    // Carregar dívidas ao iniciar
    loadDividas();

    // Event listener para o formulário de dívidas
    document.getElementById('divida-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const valorTotal = parseCurrency(document.getElementById('divida-valor-total').value);
        const numParcelas = parseInt(document.getElementById('divida-parcelas').value);
        const valorParcela = valorTotal / numParcelas;
        const primeiraParcela = document.getElementById('divida-primeira-parcela').value;
        const diaVencimento = parseInt(document.getElementById('divida-dia-vencimento').value);

        // Gerar array de parcelas
        const parcelas = [];
        for (let i = 0; i < numParcelas; i++) {
            const dataParcela = new Date(primeiraParcela);
            dataParcela.setMonth(dataParcela.getMonth() + i);
            
            // Ajustar para o dia dmento
            const ultimoDiaMes = new Date(dataParcela.getFullYear(), dataParcela.getMonth() + 1, 0).getDate();
            dataParcela.setDate(Math.min(diaVencimento, ultimoDiaMes));
            
            parcelas.push({
                numero: i + 1,
                dataVencimento: dataParcela.toISOString().split('T')[0],
                valor: valorParcela,
                pago: false
            });
        }

        const divida = {
            id: editingDividaId || Date.now().toString(),
            nome: document.getElementById('divida-nome').value,
            tipo: document.getElementById('divida-tipo').value,
            valorTotal: document.getElementById('divida-valor-total').value,
            valorParcela: formatCurrencyValue(valorParcela),
            diaVencimento: diaVencimento,
            parcelas: parcelas
        };

        if (editingDividaId) {
            // Atualizar dívida existente - manter parcelas já pagas
            const dividaExistente = dividas.find(d => d.id === editingDividaId);
            if (dividaExistente && dividaExistente.parcelas) {
                // Preservar status de pagamento das parcelas existentes
                divida.parcelas = divida.parcelas.map((parcela, index) => {
                    if (dividaExistente.parcelas[index]) {
                        return { ...parcela, pago: dividaExistente.parcelas[index].pago };
                    }
                    return parcela;
                });
            }
            const index = dividas.findIndex(d => d.id === editingDividaId);
            if (index !== -1) {
                dividas[index] = divida;
            }
        } else {
            // Adicionar nova dívida
            dividas.push(divida);
        }

        await saveDividas();
        renderDividas();
        updateDividasSummary();
        closeDividaModal();
    });
});

// === GERENCIAMENTO DE DÍVIDAS ===

let dividas = [];
let editingDividaId = null;

// Carregar dívidas do servidor
async function loadDividas() {
    if (!userId) {
        return;
    }
    try {
        const response = await fetch(`${API_URL}/dividas/${userId}`);
        dividas = await response.json();
        renderDividas();
        updateDividasSummary();
    } catch (error) {
        console.error('Erro ao carregar dívidas:', error);
        dividas = [];
    }
}

// Salvar dívidas no servidor
async function saveDividas() {
    try {
        await fetch(`${API_URL}/save-dividas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, dividas })
        });
    } catch (error) {
        console.error('Erro ao salvar dívidas:', error);
    }
}

// Abrir modal para adicionar dívida
function openDividaModal(dividaId = null) {
    const modal = document.getElementById('divida-modal');
    const form = document.getElementById('divida-form');
    const title = document.getElementById('divida-modal-title');

    if (dividaId) {
        // Modo edição
        const divida = dividas.find(d => d.id === dividaId);
        if (divida) {
            editingDividaId = dividaId;
            title.textContent = 'Editar Divida';
            document.getElementById('divida-nome').value = divida.nome;
            document.getElementById('divida-tipo').value = divida.tipo;
            document.getElementById('divida-valor-total').value = divida.valorTotal;
            document.getElementById('divida-parcelas').value = divida.parcelas.length;
            document.getElementById('divida-valor-parcela').value = divida.valorParcela;
            document.getElementById('divida-primeira-parcela').value = divida.parcelas[0].dataVencimento;
            document.getElementById('divida-dia-vencimento').value = divida.diaVencimento || 10;
        }
    } else {
        // Modo adição
        editingDividaId = null;
        title.textContent = 'Adicionar Divida';
        form.reset();
        // Set default values
        const hoje = new Date();
        const dataAtual = hoje.toISOString().split('T')[0];
        document.getElementById('divida-primeira-parcela').value = dataAtual;
        document.getElementById('divida-dia-vencimento').value = 10;
    }

    modal.style.display = 'flex';

    // Adicionar event listeners para cálculo automático
    setupAutoCalculation();
}

// Configurar cálculo automático
function setupAutoCalculation() {
    const valorTotalInput = document.getElementById('divida-valor-total');
    const parcelasInput = document.getElementById('divida-parcelas');
    const parcelaOutput = document.getElementById('divida-valor-parcela');

    function calcularAutomaticamente() {
        const valorTotal = parseCurrency(valorTotalInput.value);
        const parcelas = parseInt(parcelasInput.value);

        if (valorTotal > 0 && parcelas > 0) {
            const valorParcela = valorTotal / parcelas;
            parcelaOutput.value = formatCurrencyValue(valorParcela);
        } else {
            parcelaOutput.value = '';
        }
    }

    // Remover listeners anteriores
    valorTotalInput.removeEventListener('input', calcularAutomaticamente);
    parcelasInput.removeEventListener('input', calcularAutomaticamente);

    // Adicionar novos listeners
    valorTotalInput.addEventListener('input', calcularAutomaticamente);
    parcelasInput.addEventListener('input', calcularAutomaticamente);

    // Calcular inicialmente
    calcularAutomaticamente();
}

// Fechar modal
function closeDividaModal() {
    document.getElementById('divida-modal').style.display = 'none';
    editingDividaId = null;
}

// Salvar dívida
// Event listener movido para DOMContentLoaded

// Excluir dívida
function deleteDivida(dividaId) {
    if (confirm('Tem certeza que deseja excluir esta dívida?')) {
        dividas = dividas.filter(d => d.id !== dividaId);
        saveDividas();
        renderDividas();
        updateDividasSummary();
    }
}

// Abrir modal de parcelas
function openParcelasModal(dividaId) {
    const divida = dividas.find(d => d.id === dividaId);
    if (!divida) return;

    const modal = document.getElementById('parcelas-modal');
    document.getElementById('parcelas-modal-title').textContent = divida.nome;
    document.getElementById('parcelas-valor-total').textContent = divida.valorTotal;
    document.getElementById('parcelas-valor-parcela').textContent = divida.valorParcela;
    
    const parcelasPagas = divida.parcelas.filter(p => p.pago).length;
    document.getElementById('parcelas-progresso').textContent = `${parcelasPagas}/${divida.parcelas.length}`;

    const container = document.getElementById('parcelas-list-container');
    container.innerHTML = '';

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    divida.parcelas.forEach(parcela => {
        const dataParcela = new Date(parcela.dataVencimento);
        dataParcela.setHours(0, 0, 0, 0);
        const diffDias = Math.ceil((dataParcela - hoje) / (1000 * 60 * 60 * 24));

        let statusClass = '';
        let statusText = '';

        if (parcela.pago) {
            statusClass = 'parcela-paga';
            statusText = 'Pago';
        } else if (diffDias < 0) {
            statusClass = 'parcela-atrasada';
            statusText = `Atrasado (${Math.abs(diffDias)} dias)`;
        } else if (diffDias === 0) {
            statusClass = 'parcela-hoje';
            statusText = 'Vence hoje';
        } else if (diffDias <= 3) {
            statusClass = 'parcela-proxima';
            statusText = `Vence em ${diffDias} dias`;
        } else {
            statusText = `Vence em ${diffDias} dias`;
        }

        const parcelaElement = document.createElement('div');
        parcelaElement.className = `parcela-item ${statusClass}`;
        parcelaElement.innerHTML = `
            <div class="parcela-header">
                <span class="parcela-numero">Parcela ${parcela.numero}/${divida.parcelas.length}</span>
                <span class="parcela-valor">${parcela.valor}</span>
            </div>
            <div class="parcela-info-row">
                <span class="parcela-data"><i class="fas fa-calendar"></i> ${formatDate(parcela.dataVencimento)}</span>
                <span class="parcela-status">${statusText}</span>
            </div>
            <div class="parcela-actions">
                ${!parcela.pago ? `<button class="parcela-pagar-btn" onclick="marcarParcelaPaga('${dividaId}', ${parcela.numero - 1})">Marcar como Pago</button>` : '<span class="parcela-pago-badge"><i class="fas fa-check-circle"></i> Pago</span>'}
            </div>
        `;
        container.appendChild(parcelaElement);
    });

    modal.style.display = 'flex';
}

// Fechar modal de parcelas
function closeParcelasModal() {
    document.getElementById('parcelas-modal').style.display = 'none';
}

// Marcar parcela como paga
function marcarParcelaPaga(dividaId, parcelaIndex) {
    const divida = dividas.find(d => d.id === dividaId);
    if (divida && divida.parcelas[parcelaIndex]) {
        divida.parcelas[parcelaIndex].pago = true;
        saveDividas();
        renderDividas();
        updateDividasSummary();
        openParcelasModal(dividaId); // Reabrir para atualizar
    }
}

// Toggle detalhes da dívida (removido - não mais necessário)
function toggleDividaDetails(dividaId) {
    // Agora abre o modal de parcelas
    openParcelasModal(dividaId);
}

// Renderizar lista de dívidas
function renderDividas() {
    const container = document.getElementById('dividas-list');
    container.innerHTML = '';

    if (dividas.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: var(--spacing-xl); color: var(--color-text-secondary);">
                <p>Nenhuma divida cadastrada</p>
                <p>Clique em "Adicionar Divida" para começar</p>
            </div>
        `;
        return;
    }

    dividas.forEach(divida => {
        const parcelasPagas = divida.parcelas.filter(p => p.pago).length;
        const totalParcelas = divida.parcelas.length;
        const percentualPago = Math.round((parcelasPagas / totalParcelas) * 100);
        
        const valorTotal = parseCurrency(divida.valorTotal);
        const valorPago = (valorTotal / totalParcelas) * parcelasPagas;
        const valorRestante = valorTotal - valorPago;

        // Verificar próxima parcela não paga
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const proximaParcelaNaoPaga = divida.parcelas.find(p => !p.pago);
        
        let statusClass = '';
        if (proximaParcelaNaoPaga) {
            const dataParcela = new Date(proximaParcelaNaoPaga.dataVencimento);
            dataParcela.setHours(0, 0, 0, 0);
            const diffDias = Math.ceil((dataParcela - hoje) / (1000 * 60 * 60 * 24));

            if (diffDias < 0) {
                statusClass = 'divida-vencimento-atrasado';
            } else if (diffDias === 0) {
                statusClass = 'divida-vencimento-hoje';
            } else if (diffDias <= 3) {
                statusClass = 'divida-vencimento-proximo';
            }
        }

        const dividaElement = document.createElement('div');
        dividaElement.className = `divida-item ${statusClass}`;
        dividaElement.onclick = function(e) {
            // Não abrir modal se clicar nos botões de ação
            if (e.target.closest('.divida-actions-row')) {
                return;
            }
            openParcelasModal(divida.id);
        };
        dividaElement.innerHTML = `
            <div class="divida-header-row">
                <div class="divida-info-group">
                    <div class="divida-title">${divida.nome}</div>
                    <div class="divida-subtitle">${divida.tipo.charAt(0).toUpperCase() + divida.tipo.slice(1)}</div>
                </div>
                <div class="divida-valores">
                    <div class="divida-valor-total">${divida.valorTotal}</div>
                    <div class="divida-valor-restante">Restante: ${formatCurrencyValue(valorRestante)}</div>
                </div>
                <div class="divida-progresso-info">
                    <div class="divida-percentual">${percentualPago}%</div>
                    <div class="divida-parcelas-texto">${parcelasPagas}/${totalParcelas} pagas</div>
                </div>
            </div>
            <div class="divida-progress-bar">
                <div class="divida-progress-fill" style="width: ${percentualPago}%"></div>
            </div>
            <div class="divida-actions-row">
                <button class="divida-action-btn edit" onclick="event.stopPropagation(); openDividaModal('${divida.id}')" title="Editar">Editar</button>
                <button class="divida-action-btn delete" onclick="event.stopPropagation(); deleteDivida('${divida.id}')" title="Excluir">Excluir</button>
            </div>
        `;

        container.appendChild(dividaElement);
    });
}

// Atualizar resumo das dívidas
function updateDividasSummary() {
    const totalDividas = dividas.reduce((sum, divida) => sum + parseCurrency(divida.valorTotal), 0);
    
    // Calcular valor mensal baseado nas parcelas não pagas do mês atual
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    
    const parcelasMensais = dividas.reduce((sum, divida) => {
        const parcelasDoMes = divida.parcelas.filter(p => {
            if (p.pago) return false;
            const dataParcela = new Date(p.dataVencimento);
            return dataParcela.getMonth() === mesAtual && dataParcela.getFullYear() === anoAtual;
        });
        const valorMensal = parcelasDoMes.reduce((s, p) => s + p.valor, 0);
        return sum + valorMensal;
    }, 0);

    document.getElementById('total-dividas').textContent = formatCurrencyValue(totalDividas);
    document.getElementById('parcelas-mensais').textContent = formatCurrencyValue(parcelasMensais);
}

// Funções auxiliares
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function parseCurrency(value) {
    if (!value) return 0;
    // Remove R$, espaços, e converte vírgula para ponto
    const cleanValue = value.toString().replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
}

function formatCurrencyValue(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Funções para Patrimônio
const patrimonioTipos = [
    'Investimentos em ações',
    'Investimentos em títulos públicos',
    'Casa',
    'Carro',
    'Imóveis alugados',
    'Veículos adicionais',
    'Fundos de investimento',
    'Criptomoedas'
];

function addPatrimonio() {
    const list = document.getElementById('patrimonio-list');
    const item = document.createElement('div');
    item.className = 'patrimonio-item';
    item.innerHTML = `
        <select class="patrimonio-select">
            <option value="">Selecione</option>
            ${patrimonioTipos.map(tipo => `<option value="${tipo}">${tipo}</option>`).join('')}
        </select>
        <input type="text" class="patrimonio-value" placeholder="R$ 0,00" oninput="formatCurrency(this); updatePatrimonioTotal();">
        <button class="delete-patrimonio-btn" onclick="deletePatrimonio(this)">×</button>
    `;
    list.appendChild(item);
}

function deletePatrimonio(button) {
    button.closest('.patrimonio-item').remove();
    updatePatrimonioTotal();
}

function updatePatrimonioTotal() {
    const items = document.querySelectorAll('.patrimonio-item');
    let total = 0;
    items.forEach(item => {
        const valueInput = item.querySelector('.patrimonio-value');
        total += parseCurrency(valueInput.value);
    });
    document.getElementById('patrimonio-total').textContent = formatCurrencyValue(total);
}

function getPatrimonioData() {
    const items = document.querySelectorAll('.patrimonio-item');
    const patrimonio = [];
    items.forEach(item => {
        const select = item.querySelector('.patrimonio-select');
        const valueInput = item.querySelector('.patrimonio-value');
        if (select.value && valueInput.value) {
            patrimonio.push({
                tipo: select.value,
                valor: valueInput.value
            });
        }
    });
    return patrimonio;
}

function loadPatrimonio(patrimonioData) {
    const list = document.getElementById('patrimonio-list');
    list.innerHTML = '';
    patrimonioData.forEach(item => {
        const div = document.createElement('div');
        div.className = 'patrimonio-item';
        div.innerHTML = `
            <select class="patrimonio-select">
                <option value="">Selecione</option>
                ${patrimonioTipos.map(tipo => `<option value="${tipo}" ${tipo === item.tipo ? 'selected' : ''}>${tipo}</option>`).join('')}
            </select>
            <input type="text" class="patrimonio-value" value="${item.valor}" oninput="formatCurrency(this); updatePatrimonioTotal();">
            <button class="delete-patrimonio-btn" onclick="deletePatrimonio(this)">×</button>
        `;
        list.appendChild(div);
    });
    updatePatrimonioTotal();
}