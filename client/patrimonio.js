// === GERENCIAMENTO DE PATRIMÔNIO ===

function addPatrimonioItem(tipo = '', valor = '') {
    const container = document.getElementById('patrimonio-list');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'patrimonio-item';
    
    itemDiv.innerHTML = `
        <select class="patrimonio-tipo">
            <option value="">Selecione o tipo</option>
            <option value="casa">Casa/Imóvel</option>
            <option value="carro">Carro/Veículo</option>
            <option value="investimentos">Investimentos</option>
            <option value="poupanca">Poupança</option>
            <option value="outros">Outros</option>
        </select>
        <input type="text" class="patrimonio-valor" placeholder="R$ 0,00" value="${valor}" oninput="formatCurrency(this)">
        <button type="button" class="patrimonio-remove-btn" onclick="removePatrimonioItem(this)">Remover</button>
    `;
    
    // Selecionar o tipo se fornecido
    if (tipo) {
        const select = itemDiv.querySelector('.patrimonio-tipo');
        select.value = tipo;
    }
    
    container.appendChild(itemDiv);
}

function removePatrimonioItem(button) {
    button.closest('.patrimonio-item').remove();
}

function getPatrimonioData() {
    const items = document.querySelectorAll('.patrimonio-item');
    const patrimonio = [];
    
    items.forEach(item => {
        const tipo = item.querySelector('.patrimonio-tipo').value;
        const valor = item.querySelector('.patrimonio-valor').value;
        
        if (tipo && valor) {
            patrimonio.push({ tipo, valor });
        }
    });
    
    return patrimonio;
}

function loadPatrimonio(patrimonioArray) {
    const container = document.getElementById('patrimonio-list');
    container.innerHTML = '';
    
    if (patrimonioArray && patrimonioArray.length > 0) {
        patrimonioArray.forEach(item => {
            addPatrimonioItem(item.tipo, item.valor);
        });
    } else {
        // Adicionar pelo menos um item vazio
        addPatrimonioItem();
    }
}

// Inicializar patrimônio ao carregar página
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se estamos na página de perfil
    if (document.getElementById('patrimonio-list')) {
        // Adicionar um item vazio inicial se não houver nenhum
        if (document.querySelectorAll('.patrimonio-item').length === 0) {
            addPatrimonioItem();
        }
    }
});

