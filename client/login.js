// ========== VARIÁVEIS GLOBAIS ==========
const API_BASE = window.API_BASE || 'http://localhost:3001';  // Em produção, defina window.API_BASE no HTML

document.getElementById('show-register').addEventListener('click', function() {
    document.getElementById('login-form-container').style.display = 'none';
    document.getElementById('register-form-container').style.display = 'block';
});

document.getElementById('show-login').addEventListener('click', function() {
    document.getElementById('register-form-container').style.display = 'none';
    document.getElementById('login-form-container').style.display = 'block';
});

// Funções para o modal de notificação
function showNotificationModal(messages) {
    const modal = document.getElementById('notification-modal');
    const messagesDiv = document.getElementById('modal-messages');
    messagesDiv.innerHTML = messages.map(msg => `<p>${msg}</p>`).join('');
    modal.style.display = 'flex';
}

function hideNotificationModal() {
    document.getElementById('notification-modal').style.display = 'none';
}

// Event listeners para o modal
document.getElementById('close-modal').addEventListener('click', hideNotificationModal);
document.getElementById('support-button').addEventListener('click', function() {
    window.open('https://wa.link/37wkdq', '_blank');  // Mudança: Abre o link do WhatsApp em nova aba
});

document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;

    fetch(`${API_BASE}/login`, {  // Mudança: use API_BASE
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/';
        } else {
            // Mostra modal em vez de alert
            if (Array.isArray(data.messages)) {
                showNotificationModal(data.messages);
            } else {
                showNotificationModal([data.message || 'Erro desconhecido']);
            }
        }
    })
    .catch(error => console.error('Erro:', error));
});

document.getElementById('register-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const cpf = document.getElementById('register-cpf').value;
    const telefone = document.getElementById('register-telefone').value;

    // Validação básica
    if (!cpf || !telefone) {
        alert('CPF e telefone são obrigatórios.');
        return;
    }

    fetch(`${API_BASE}/register`, {  // Mudança: use API_BASE
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, cpf, telefone })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/';
        } else {
            alert('Cadastro falhou: ' + data.message);
        }
    })
    .catch(error => console.error('Erro:', error));
});