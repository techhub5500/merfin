// ==========================================
// CONFIGURAÇÃO DE AMBIENTE
// ==========================================
const getApiUrl = () => {
    // Se estiver em produção (Render)
    if (window.location.hostname === 'merfin-home.onrender.com') {
        return 'https://merfin-server.onrender.com'; // ✅ CORRIGIDO
    }
    // Se estiver em desenvolvimento local
    return 'http://localhost:3000'; // Porta do servidor principal
};

const API_URL = getApiUrl();

// ==========================================
// EVENT LISTENERS
// ==========================================
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
    window.open('https://wa.link/37wkdq', '_blank');
});

// ==========================================
// FORMULÁRIO DE LOGIN
// ==========================================
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;

    fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // ✅ ADICIONAR: Aguardar 500ms e VERIFICAR sessão antes de redirecionar
            console.log('Login bem-sucedido, verificando sessão...');
            
            setTimeout(() => {
                fetch(`${API_URL}/check-login`, {
                    method: 'GET',
                    credentials: 'include'
                })
                .then(r => r.json())
                .then(checkData => {
                    if (checkData.loggedIn) {
                        console.log('Sessão confirmada, redirecionando...');
                        window.location.href = '/';
                    } else {
                        console.error('Sessão não confirmada após login!');
                        showNotificationModal(['Erro ao criar sessão. Tente novamente.']);
                    }
                })
                .catch(err => {
                    console.error('Erro ao verificar sessão:', err);
                    showNotificationModal(['Erro de conexão. Tente novamente.']);
                });
            }, 500); // Aguarda 500ms para sessão salvar no MongoDB
        } else {
            if (Array.isArray(data.messages)) {
                showNotificationModal(data.messages);
            } else {
                showNotificationModal([data.message || 'Erro desconhecido']);
            }
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        showNotificationModal(['Erro de conexão. Tente novamente.']);
    });
});


// ==========================================
// FORMULÁRIO DE REGISTRO
// ==========================================
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

    fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // ← importante
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