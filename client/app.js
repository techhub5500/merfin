// ========== CONFIGURAÇÃO DE AMBIENTE ==========
const getApiUrl = () => {
    // Se estiver em produção (Render)
    if (window.location.hostname === 'merfin-home.onrender.com') {
        return 'https://merfin-server.onrender.com'; // ✅ Auth, chat, perfil
    }
    return 'http://localhost:3000';
};

const getDataApiUrl = () => {
    // Se estiver em produção (Render)
    if (window.location.hostname === 'merfin-home.onrender.com') {
        return 'https://merfin-dado.onrender.com'; // ✅ Company data
    }
    return 'http://localhost:3001';
};

const API_URL = getApiUrl(); // Auth, chat, perfil, newsletter
const DATA_API_URL = getDataApiUrl(); // Company data

// ========== VARIÁVEIS GLOBAIS ==========
let isSearching = false;
let cardUpdateInterval;
let currentChatId = null;

// Variáveis para a página Perfil
let userProfile = {};  // Estado global para respostas do perfil de investimento
let currentBlock = null;  // Para editar bloco inteiro (1-6)
let currentKey = null;    // Para editar resposta individual (ex.: 'patrimonio')

// Lista de tickers populares para rotação (adicione mais se quiser)
const popularTickers = ['PETR3', 'B3SA3', 'VALE3', 'ITUB4', 'ABEV3', 'WEGE3', 'BBAS3', 'MGLU3', 'ENEV3', 'CSAN3',
 'COGN3', 'EMBR3', 'EQTL3', 'VBBR3', 'EGIE3', 'CPLE6', 'NEOE3', 'CMIG4', 'LIGT3', 'SBSP3']


const suggestions = [
    "Recebi uma recomendação e preciso validar",
];

let currentIndex = 0; // Índice inicial do carrossel

// ========== FUNÇÕES UTILITÁRIAS ==========
function getRandomTickers() {
    const shuffled = popularTickers.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
}

// Função para renderizar o carrossel (mostra 3 sugestões por vez)
function renderSuggestionsCarousel() {
    const container = document.getElementById('suggestions-carousel');
    if (!container) return;

    container.innerHTML = ''; // Limpa o container

    // Adiciona seta esquerda (se não for o início)
    if (currentIndex > 0) {
        const leftArrow = document.createElement('button');
        leftArrow.className = 'carousel-arrow left';
        leftArrow.innerHTML = '‹';
        leftArrow.addEventListener('click', () => {
            currentIndex = Math.max(0, currentIndex - 1);
            renderSuggestionsCarousel();
        });
        container.appendChild(leftArrow);
    }

    // Adiciona as 2 sugestões visíveis
    const visibleSuggestions = suggestions.slice(currentIndex, currentIndex + 2);
    visibleSuggestions.forEach((suggestion) => {
        const btn = document.createElement('button');
        btn.className = 'suggestion-btn';
        btn.textContent = suggestion;
        btn.addEventListener('click', () => {
            const chatInput = document.getElementById('message-input');
            chatInput.value = suggestion;
            chatInput.dispatchEvent(new Event('input'));
            document.getElementById('send-btn').click();
        });
        container.appendChild(btn);
    });

    // Adiciona seta direita (se houver mais sugestões)
    if (currentIndex + 2 < suggestions.length) {
        const rightArrow = document.createElement('button');
        rightArrow.className = 'carousel-arrow right';
        rightArrow.innerHTML = '›';
        rightArrow.addEventListener('click', () => {
            currentIndex = Math.min(suggestions.length - 2, currentIndex + 1);
            renderSuggestionsCarousel();
        });
        container.appendChild(rightArrow);
    }
}

// ========== FUNÇÕES DE CARDS ==========
async function updateCompanyCards() {
    const tickers = getRandomTickers().join(',');
    try {
        const response = await fetch(`${DATA_API_URL}/api/company-cards?tickers=${tickers}`); // ✅ USAR DATA_API_URL
        if (!response.ok) throw new Error('Erro na busca');
        const companies = await response.json();
        
        const companyCards = document.getElementById('company-cards');
        if (companyCards && window.renderCompanyCards) {
            window.renderCompanyCards(companies, companyCards);
        }
    } catch (error) {
        console.error('Erro ao atualizar cards:', error);
    }
}

function startCardUpdates() {
    updateCompanyCards(); // Atualizar imediatamente
    cardUpdateInterval = setInterval(updateCompanyCards, 5000);
}

function pauseCardUpdates() {
    if (cardUpdateInterval) {
        clearInterval(cardUpdateInterval);
        cardUpdateInterval = null;
    }
}

function resumeCardUpdates() {
    if (!cardUpdateInterval) {
        startCardUpdates();
    }
}

// Expor funções globais para o componente React
window.pauseCardUpdates = pauseCardUpdates;
window.resumeCardUpdates = resumeCardUpdates;

// ========== FUNÇÕES DE BUSCA ==========
async function fetchCompanyIndicators(ticker) {
    try {
        const response = await fetch(`${DATA_API_URL}/api/company-indicators/${ticker}`); // ✅ USAR DATA_API_URL
        if (!response.ok) throw new Error('Erro na busca');
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar indicadores:', error);
        return null;
    }
}

async function fetchCompanyIndicatorsByName(name) {
    try {
        const response = await fetch(`${DATA_API_URL}/api/company-indicators-by-name?name=${encodeURIComponent(name)}`); // ✅ USAR DATA_API_URL
        if (!response.ok) throw new Error('Erro na busca');
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar indicadores:', error);
        return null;
    }
}

// ========== FUNÇÕES DE PERFIL ==========
async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/load-profile`);
        if (response.ok) {
            const data = await response.json();
            userProfile = data.profileData || {};
        } else {
            console.error('Erro ao carregar perfil');
            userProfile = {};
        }
    } catch (error) {
        console.error('Erro de rede ao carregar perfil:', error);
        userProfile = {};
    }
}

async function saveProfile() {
    try {
        const response = await fetch(`${API_URL}/save-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileData: userProfile })
        });
        if (!response.ok) {
            console.error('Erro ao salvar perfil');
        }
    } catch (error) {
        console.error('Erro de rede ao salvar perfil:', error);
    }
}

// NOVO: Função global para verificar se há dados no perfil
window.hasProfileData = function() { return Object.keys(userProfile).length > 0; };

// ========== FUNÇÕES DE CHAT ==========
function clearChat() {
    const chatMessages = document.getElementById('messages');
    if (chatMessages) {
        // Remover apenas as mensagens de chat, preservando outros elementos (ex.: company-cards se estiver dentro)
        const messages = chatMessages.querySelectorAll('.message, .message-container');
        messages.forEach(msg => msg.remove());
        
        // Verificar se os elementos existem; se não, recriar ou alertar (fallback)
        let companyCards = document.getElementById('company-cards');
        let searchBar = document.getElementById('search-bar');
        let chatInputArea = document.querySelector('.chat-input-area');
        
        if (!companyCards) {
            // Fallback: recriar o container se removido (assumindo que deve estar dentro de messages)
            companyCards = document.createElement('div');
            companyCards.id = 'company-cards';
            chatMessages.appendChild(companyCards);
        }
        if (!searchBar) {
            searchBar = document.createElement('div');
            searchBar.id = 'search-bar';
            chatMessages.appendChild(searchBar);
        }
        if (!chatInputArea) {
            chatInputArea = document.createElement('div');
            chatInputArea.className = 'chat-input-area';
            chatMessages.appendChild(chatInputArea);
        }
        
        // Mostrar os elementos
        if (companyCards) companyCards.style.display = 'block';
        if (searchBar) searchBar.style.display = 'flex';
        if (chatInputArea) chatInputArea.style.display = 'block';
        
        // Remover indicadores se existirem
        const indicatorsContainer = document.getElementById('indicators-container');
        if (indicatorsContainer) {
            indicatorsContainer.remove();
        }
        
        // Atualizar cards imediatamente
        updateCompanyCards();
        
        // Retomar rotação dos cards
        resumeCardUpdates();
    }
}

function loadChat(messages, chatId) {  // Parâmetro chatId adicionado
    const chatMessages = document.getElementById('messages');
    if (chatMessages) {
        currentChatId = chatId;
        console.log('Chat carregado:', currentChatId);
        
        // Remover apenas mensagens existentes, sem limpar innerHTML (preserva company-cards, etc.)
        const existingMessages = chatMessages.querySelectorAll('.message, .message-container');
        existingMessages.forEach(msg => msg.remove());
        
        messages.forEach(msg => {
            if (msg.role === 'assistant') {
                // Para mensagens da IA: usar MessageRenderer para processar markdown
                const aiDiv = document.createElement('div');
                aiDiv.className = 'message-container';
                chatMessages.appendChild(aiDiv);
                if (window.renderAIMessage) {
                    window.renderAIMessage(msg.content, aiDiv);
                } else {
                    // Fallback se React não carregar
                    aiDiv.className = 'message ai';
                    aiDiv.textContent = msg.content;
                }
            } else {
                // Para mensagens do usuário: texto simples
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message user';
                messageDiv.textContent = msg.content;
                chatMessages.appendChild(messageDiv);
            }
        });
        
        // Ocultar barra de pesquisa e cards ao carregar chat do histórico
        const searchBar = document.querySelector('.search-bar');
        const companyCards = document.getElementById('company-cards');
        if (searchBar) searchBar.style.display = 'none';
        if (companyCards) companyCards.style.display = 'none';
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// ========== FUNÇÕES DE UI ==========
function switchPage(page) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.style.display = 'none';
    });
    const targetSection = document.getElementById(page + '-section');
    if (targetSection) {
        targetSection.style.display = 'block';
    }
}

function showDelayNotification() {
    // Verificar limite diário (máximo 3 vezes por dia)
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('notificationDate');
    let count = parseInt(localStorage.getItem('notificationCount') || '0');

    if (storedDate !== today) {
        // Resetar contador se for um novo dia
        count = 0;
        localStorage.setItem('notificationDate', today);
    }

    if (count >= 3) {
        // Já mostrou 3 vezes hoje, não mostrar mais
        return;
    }

    // Incrementar contador
    count++;
    localStorage.setItem('notificationCount', count.toString());

    // Criar um toast sutil
    const notification = document.createElement('div');
    notification.id = 'delay-notification';
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(18, 18, 18, 0.95);  /* Fundo escuro semi-transparente */
        color: var(--color-text-primary);
        padding: var(--spacing-lg);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        max-width: 350px;
        font-size: 14px;
        font-family: 'Poppins', sans-serif;
        border: 1px solid var(--color-border);
        backdrop-filter: blur(10px);  /* Efeito de vidro */
        opacity: 0;
        transform: translateY(20px);
        transition: all var(--transition-slow);
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
            <span style="color: var(--color-primary); font-size: 16px;">⏳</span>
            <div>
                <strong style="color: var(--color-text-primary);">Análise em andamento...</strong><br>
                <span style="color: var(--color-text-secondary); font-size: 13px;">O Merfin analisa cuidadosamente para entregar a melhor resposta, levando mais tempo para avaliar todos os dados com precisão.</span>
            </div>
        </div>
        <button id="close-notification" style="
            position: absolute;
            top: var(--spacing-xs);
            right: var(--spacing-xs);
            background: none;
            border: none;
            color: var(--color-text-tertiary);
            cursor: pointer;
            font-size: 12px;
            transition: color var(--transition-fast);
        ">✕</button>
    `;
    document.body.appendChild(notification);
    
    // Animação de entrada
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 100);
    
    // Fechar automaticamente após 11 segundos (6 + 5 extras)
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 11000);
    
    document.getElementById('close-notification').addEventListener('click', () => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    });
}

// ========== FUNÇÃO DE PESQUISA ==========
window.researchCompany = async function(ticker) {
    // Pausar a rotação dos cards para focar nos indicadores
    pauseCardUpdates();
    
    // Ocultar cards, barra de pesquisa e input do chat
    const companyCards = document.getElementById('company-cards');
    const searchBar = document.querySelector('.search-bar');
    const chatInputArea = document.querySelector('.chat-input-area');
    if (companyCards) companyCards.style.display = 'none';
    if (searchBar) searchBar.style.display = 'none';
    if (chatInputArea) chatInputArea.style.display = 'none';  // Ocultar input do chat
   
    // Encontrar ou criar o container para exibir os indicadores
    let indicatorsContainer = document.getElementById('indicators-container');
    if (!indicatorsContainer) {
        indicatorsContainer = document.createElement('div');
        indicatorsContainer.id = 'indicators-container';
        indicatorsContainer.style.marginTop = '20px';
        // Inserir onde estavam os cards
        const companyCardsContainer = document.getElementById('company-cards').parentNode;
        if (companyCardsContainer) {
            companyCardsContainer.appendChild(indicatorsContainer);
        }
    }
    
    // Limpar conteúdo anterior e mostrar loading
    indicatorsContainer.innerHTML = '';
    if (window.renderLoadingIndicator) {
        window.renderLoadingIndicator(indicatorsContainer);
    }
    
    // Buscar indicadores com mínimo de 2 segundos
    const fetchPromise = fetchCompanyIndicators(ticker);
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
        const [data] = await Promise.all([fetchPromise, timeoutPromise]);
        
        if (data) {
            // Limpar loading e renderizar indicadores
            indicatorsContainer.innerHTML = '';
            if (window.renderIndicatorsTable) {
                window.renderIndicatorsTable([data], indicatorsContainer);
            } else {
                // Fallback
                const table = document.createElement('table');
                table.innerHTML = `
                    <tr><th colspan="2">${data.name} (${data.ticker})</th></tr>
                    ${data.indicators.map(ind => `<tr><td>${ind.label}</td><td>${ind.value}</td></tr>`).join('')}
                `;
                indicatorsContainer.appendChild(table);
            }
            
            // Rolagem suave
            indicatorsContainer.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Erro
            indicatorsContainer.innerHTML = '';
            alert('Erro ao buscar indicadores para ' + ticker + '. Verifique o console.');
            resumeCardUpdates();
            if (companyCards) companyCards.style.display = 'block';
            if (searchBar) searchBar.style.display = 'flex';
        }
    } catch (error) {
        indicatorsContainer.innerHTML = '';
        console.error('Erro:', error);
        alert('Erro ao buscar indicadores.');
        resumeCardUpdates();
        if (companyCards) companyCards.style.display = 'block';
        if (searchBar) searchBar.style.display = 'flex';
    }
};

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se o usuário está logado
    fetch(`${API_URL}/check-login`)
        .then(response => response.json())
        .then(data => {
            if (!data.loggedIn) {
                window.location.href = '/login.html';
            }
        })
        .catch(error => {
            console.error('Erro ao verificar login:', error);
            window.location.href = '/login.html';
        });

    // ========== NOTÍCIAS ==========
    const noticiasBtn = document.getElementById('noticias-btn');
    const noticiasModal = document.getElementById('noticias-modal');
    const closeNoticiasModal = document.getElementById('close-noticias-modal');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    const loadingPhrases = [
        "Buscando notícias...",
        "Analisando fontes...",
        "Verificando impacto no mercado...",
        "Processando informações...",
        "Filtrando conteúdos relevantes...",
        "Avaliando tendências...",
        "Compilando dados...",
        "Organizando notícias...",
        "Finalizando busca...",
        "Preparando resultados..."
    ];

    let loadingInterval;
    let phraseIndex = 0;

    if (noticiasBtn && noticiasModal) {
        noticiasBtn.addEventListener('click', function() {
            // Mostrar overlay de loading
            const content = document.querySelector('.content');
            content.style.filter = 'blur(4px)';
            loadingOverlay.style.display = 'flex';
            loadingText.textContent = 'Carregando newsletter do dia...';

            fetch(`${API_URL}/newsletter`)
                .then(response => response.json())
                .then(data => {
                    // Esconder loading
                    loadingOverlay.style.display = 'none';
                    content.style.filter = 'none';

                    if (!data.success) {
                        alert(data.message || 'Newsletter não disponível');
                        return;
                    }

                    const noticiasContent = document.getElementById('noticias-content');
                    let html = `<p style="font-size: 16px; margin-bottom: 20px;">${data.introducao}</p>`;
                    html += '<div class="noticias-grid">';
                    data.noticias.forEach(noticia => {
                        html += `
                            <div class="noticia-card">
                                <h5>${noticia.titulo}</h5>
                                <p>${noticia.resumo}</p>
                                <p><strong>Impacto:</strong> ${noticia.impacto}</p>
                                <a href="${noticia.fonte}" target="_blank" rel="noopener noreferrer">Ver fonte</a>
                            </div>
                        `;
                    });
                    html += '</div>';
                    html += `<p style="font-size: 16px; margin-top: 20px;">${data.conclusao}</p>`;
                    noticiasContent.innerHTML = html;

                    // Alterar título do modal para incluir a data
                    const title = document.getElementById('noticias-title');
                    title.textContent = `Newsletter Merfin - ${new Date(data.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

                    // Mostrar modal
                    noticiasModal.style.display = 'flex';
                })
                .catch(error => {
                    loadingOverlay.style.display = 'none';
                    content.style.filter = 'none';
                    console.error('Erro ao obter newsletter:', error);
                    alert('Erro ao carregar newsletter. Tente novamente.');
                });
        });
    }

    if (closeNoticiasModal && noticiasModal) {
        closeNoticiasModal.addEventListener('click', function() {
            noticiasModal.style.display = 'none';
        });
    }

    // ========== NAVEGAÇÃO DA SIDEBAR ==========
    document.querySelectorAll('.sidebar a[data-page]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            switchPage(page);
            if (page === 'chat') {
                clearChat();
            }
            if (page === 'perfil') {
                loadProfile();
                if (window.renderProfilePage) {
                    window.renderProfilePage(userProfile, document.getElementById('profile-content'));
                }
            }
        });
    });

    // ========== TOGGLE SIDEBAR ==========
    const toggleBtn = document.getElementById('toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
        });
    }

    // ========== MODO ESCURO ==========
    const darkModeSwitch = document.getElementById('dark-mode-switch');
    if (darkModeSwitch) {
        darkModeSwitch.addEventListener('change', function() {
            document.body.classList.toggle('dark-mode', this.checked);
        });
    }

    // ========== BOTÃO DE SAIR ==========
    const exitBtn = document.getElementById('exit-btn');
if (exitBtn) {
    exitBtn.addEventListener('click', function() {
        fetch(`${API_URL}/logout`, {  // ✅ ADICIONAR API_URL
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '/login.html';
            } else {
                alert('Erro ao sair');
            }
        })
        .catch(error => console.error('Erro:', error));
    });
}

    // ========== NOVO CHAT ==========
    const newChatBtn = document.getElementById('new-chat-btn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function() {
            fetch(`${API_URL}/new-chat`, {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.chatId) {
                    currentChatId = data.chatId;
                    console.log('Novo chat criado:', currentChatId);
                    clearChat();
                } else {
                    alert('Erro ao criar novo chat');
                }
            })
            .catch(error => {
                console.error('Erro ao criar novo chat:', error);
                alert('Erro ao criar novo chat');
            });
        });
    }

    // ========== HISTÓRICO ==========
    const historyBtn = document.getElementById('history-btn');
    const historyPanel = document.getElementById('history-panel');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const historyList = document.getElementById('history-list');
    const historySearch = document.getElementById('history-search');
    const deleteAllHistoryBtn = document.getElementById('delete-all-history-btn');

    let chatsData = [];

    if (historyBtn && historyPanel) {
        historyBtn.addEventListener('click', function() {
            historyPanel.style.display = 'flex';
        fetch(`${API_URL}/history`)  
            .then(response => response.json())
                .then(data => {
                    chatsData = data;
                    historyList.innerHTML = '';
                    if (data.length === 0) {
                        historyList.innerHTML = '<li>Nenhum histórico disponível.</li>';
                    } else {
                        data.forEach(chat => {
                            const li = document.createElement('li');
                            li.style.position = 'relative';
                            li.innerHTML = `
                                <span>${chat.title} - ${new Date(chat.createdAt).toLocaleString()}</span>
                                <button class="delete-chat-btn" data-chat-id="${chat.id}" title="Deletar chat">
                                    <i class="fas fa-trash"></i>
                                </button>
                            `;
                            li.addEventListener('click', function(e) {
                                if (e.target.closest('.delete-chat-btn')) return;
                                fetch(`${API_URL}/chat/${chat.id}`)
                                    .then(response => response.json())
                                    .then(chatData => {
                                        if (chatData.messages) {
                                            loadChat(chatData.messages, chat.id);
                                            historyPanel.style.display = 'none';
                                        } else {
                                            alert('Erro ao carregar chat');
                                        }
                                    })
                                    .catch(error => {
                                        console.error('Erro ao carregar chat:', error);
                                        alert('Erro ao carregar chat');
                                    });
                            });
                            historyList.appendChild(li);
                        });
                    }
                })
                .catch(error => {
                    console.error('Erro ao obter histórico:', error);
                    alert('Erro ao obter histórico');
                });
        });
    }

    historyList.addEventListener('click', function(e) {
        if (e.target.closest('.delete-chat-btn')) {
            const btn = e.target.closest('.delete-chat-btn');
            const chatId = btn.dataset.chatId;
            if (confirm('Tem certeza que deseja deletar este chat?')) {
                fetch(`${API_URL}/chat/${chatId}`, {
                    method: 'DELETE'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        historyBtn.click();
                    } else {
                        alert('Erro ao deletar chat');
                    }
                })
                .catch(error => {
                    console.error('Erro ao deletar chat:', error);
                    alert('Erro ao deletar chat');
                });
            }
        }
    });

    if (closeHistoryBtn && historyPanel) {
        closeHistoryBtn.addEventListener('click', function() {
            historyPanel.style.display = 'none';
        });
    }

    if (deleteAllHistoryBtn) {
    deleteAllHistoryBtn.addEventListener('click', function() {
        if (confirm('Tem certeza que deseja apagar todo o histórico?')) {
            fetch(`${API_URL}/history`, {  // ✅ ADICIONAR API_URL
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    historyList.innerHTML = '<li>Nenhum histórico disponível.</li>';
                    alert('Histórico apagado com sucesso');
                } else {
                    alert('Erro ao apagar histórico');
                }
            })
            .catch(error => {
                console.error('Erro ao apagar histórico:', error);
                alert('Erro ao apagar histórico');
            });
        }
    });
}

    if (historySearch && historyList) {
        historySearch.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            const items = historyList.querySelectorAll('li');
            items.forEach((item, index) => {
                const chat = chatsData[index];
                if (chat) {
                    const searchText = `${chat.title} ${new Date(chat.createdAt).toLocaleString()} ${chat.searchText}`.toLowerCase();
                    if (searchText.includes(query)) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                }
            });
        });
    }

    // ========== FUNCIONALIDADE DO CHAT ==========
    const chatInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('messages');
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const documentsIndicator = document.getElementById('documents-indicator');
    const documentsCount = document.getElementById('documents-count');

    // Função para atualizar indicador de documentos
    function updateDocumentsIndicator() {
        const totalFiles = Array.from(fileInputs).reduce((total, input) => total + input.files.length, 0);
        if (totalFiles > 0) {
            documentsIndicator.style.display = 'flex';
            documentsCount.textContent = totalFiles;
        } else {
            documentsIndicator.style.display = 'none';
        }
    }

    // Handle file selection for all inputs
    fileInputs.forEach(input => {
        input.addEventListener('change', updateDocumentsIndicator);
    });

    if (sendBtn && chatInput && chatMessages) {
        // Evento para esconder a frase inicial ao começar a digitar
        chatInput.addEventListener('input', function() {
            const h2 = chatMessages.querySelector('h2');
            if (h2) {
                h2.style.display = 'none';
            }
        });

        // Adicionar após a definição de chatInput no event listener DOMContentLoaded
        let originalTextareaHeight = 0;
        let maxTextareaHeight = 0;

        if (chatInput) {
            // Calcular altura original após o carregamento
            setTimeout(() => {
                originalTextareaHeight = chatInput.scrollHeight;
                maxTextareaHeight = originalTextareaHeight * 10;
            }, 100); // Pequeno delay para garantir renderização

            // Ajustar altura dinamicamente no evento input
            chatInput.addEventListener('input', function() {
                // Esconder frase inicial
                const h2 = chatMessages.querySelector('h2');
                if (h2) {
                    h2.style.display = 'none';
                }

                // Ocultar barra de pesquisa e cards quando começar a digitar
                const searchBar = document.querySelector('.search-bar');
                const companyCards = document.getElementById('company-cards');
                if (searchBar) searchBar.style.display = 'none';
                if (companyCards) companyCards.style.display = 'none';

                // Ajuste de altura
                this.style.height = 'auto';
                let newHeight = this.scrollHeight;
                if (newHeight > maxTextareaHeight) {
                    this.style.height = maxTextareaHeight + 'px';
                    this.style.overflowY = 'auto';
                } else {
                    this.style.height = newHeight + 'px';
                    this.style.overflowY = 'hidden';
                }
            });
        }

        sendBtn.addEventListener('click', async function() {
            // Resetar altura imediatamente ao clicar em enviar
            if (chatInput) {
                chatInput.style.height = originalTextareaHeight + 'px';
                chatInput.style.overflowY = 'hidden';
            }

            const message = chatInput.value.trim();
            const files = Array.from(fileInputs).flatMap(input => Array.from(input.files));
            if (message || files.length > 0) {
                const initialText = document.getElementById('initial-text');
                if (initialText) {
                    initialText.style.display = 'none';
                }

                showDelayNotification();
                // Esconder a frase inicial se ainda estiver visível
                const h2 = chatMessages.querySelector('h2');
                if (h2) {
                    h2.style.display = 'none';
                }

                // Adicionar mensagem do usuário ao chat
                const userMessageDiv = document.createElement('div');
                userMessageDiv.className = 'message user';
                userMessageDiv.textContent = message || 'Anexando arquivos...';
                chatMessages.appendChild(userMessageDiv);
                chatInput.value = '';

                // Sistema de etapas com pausa em "Buscando dados" e "Finalizando"
                const thinkingDiv = document.createElement('div');
                thinkingDiv.className = 'message ai';
                
                // Definir etapas do processo (SEM duração exibida)
                const steps = [
                    { id: 'receiving', icon: 'fa-download', text: 'Recebendo sua mensagem' },
                    { id: 'analyzing', icon: 'fa-brain', text: 'Analisando contexto' },
                    { id: 'searching', icon: 'fa-database', text: 'Buscando dados relevantes' }, // PAUSA AQUI
                    { id: 'processing', icon: 'fa-microchip', text: 'Processando informações' },
                    { id: 'generating', icon: 'fa-wand-magic-sparkles', text: 'Gerando resposta otimizada' },
                    { id: 'finalizing', icon: 'fa-check-circle', text: 'Finalizando análise' } // PAUSA AQUI
                ];
                
                // Criar HTML das etapas
                const progressHTML = `
                    <div class="thinking-progress">
                        ${steps.map(step => `
                            <div class="progress-step pending" data-step="${step.id}">
                                <div class="step-icon">
                                    <i class="fa-solid ${step.icon}"></i>
                                </div>
                                <span class="step-text">${step.text}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                thinkingDiv.innerHTML = progressHTML;
                chatMessages.appendChild(thinkingDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                // Simular progresso das etapas ATÉ "Buscando dados"
                const progressSteps = thinkingDiv.querySelectorAll('.progress-step');
                let currentStepIndex = 0;
                const pauseAtSearching = 2; // Índice da etapa "Buscando dados" (terceira etapa)
                
                const progressInterval = setInterval(() => {
                    if (currentStepIndex > 0) {
                        // Marcar etapa anterior como concluída
                        const prevStep = progressSteps[currentStepIndex - 1];
                        prevStep.classList.remove('active');
                        prevStep.classList.add('completed');
                        prevStep.querySelector('.step-icon i').className = 'fa-solid fa-check';
                    }
                    
                    if (currentStepIndex <= pauseAtSearching) {
                        // Ativar etapa atual
                        const currentStep = progressSteps[currentStepIndex];
                        currentStep.classList.remove('pending');
                        currentStep.classList.add('active');
                        
                        // Adicionar spinner à etapa ativa
                        const icon = currentStep.querySelector('.step-icon i');
                        icon.className = 'fa-solid fa-spinner';
                        
                        currentStepIndex++;
                        
                        // PARAR ao chegar em "Buscando dados"
                        if (currentStepIndex > pauseAtSearching) {
                            clearInterval(progressInterval);
                        }
                    }
                }, 1500); // Trocar etapa a cada 1.5 segundos

                // Verificar se precisa criar novo chat
                if (!currentChatId) {
                    console.log('Nenhum chat ativo, criando novo...');
                    try {
                        const newChatResponse = await fetch(`${API_URL}/new-chat`, { method: 'POST' });
                        const newChatData = await newChatResponse.json();
                        if (newChatData.chatId) {
                            currentChatId = newChatData.chatId;
                            console.log('Novo chat criado automaticamente:', currentChatId);
                        } else {
                            throw new Error('Falha ao criar chat');
                        }
                    } catch (error) {
                        console.error('Erro ao criar chat:', error);
                        clearInterval(progressInterval);
                        thinkingDiv.remove();
                        alert('Erro ao criar novo chat');
                        return;
                    }
                }

                // Enviar mensagem e arquivos para o servidor
                try {
                    const formData = new FormData();
                    formData.append('message', message);
                    formData.append('chatId', currentChatId);
                    console.log('Enviando mensagem para chat:', currentChatId);
                    
                    files.forEach(file => {
                        formData.append('files', file);
                    });

                    const response = await fetch(`${API_URL}/chat`, {
                        method: 'POST',
                        body: formData,
                    });
                    
                    const data = await response.json();
                    
                    // Parar animação de progresso (caso ainda esteja rodando)
                    clearInterval(progressInterval);
                    
                    if (!response.ok) {
                        thinkingDiv.remove();
                        if (response.status === 401) {
                            alert('Sessão expirada. Redirecionando para login.');
                            window.location.href = '/login.html';
                        } else if (response.status === 429) {
                            alert('Cota da API excedida. Tente novamente mais tarde.');
                        } else {
                            alert('Erro: ' + (data.error || 'Erro desconhecido'));
                        }
                        return;
                    }
                    
                    if (data.response) {
                        // RESPOSTA CHEGOU: Completar etapas 3, 4, 5 rapidamente
                        const stepsToComplete = [2, 3, 4]; // "Buscando", "Processando", "Gerando"
                        
                        for (let i = 0; i < stepsToComplete.length; i++) {
                            const stepIndex = stepsToComplete[i];
                            const step = progressSteps[stepIndex];
                            
                            // Marcar como ativa brevemente
                            step.classList.remove('pending');
                            step.classList.add('active');
                            step.querySelector('.step-icon i').className = 'fa-solid fa-spinner';
                            
                            // Aguardar 300ms e completar
                            await new Promise(resolve => setTimeout(resolve, 300));
                            
                            step.classList.remove('active');
                            step.classList.add('completed');
                            step.querySelector('.step-icon i').className = 'fa-solid fa-check';
                        }
                        
                        // ATIVAR última etapa "Finalizando análise" e PAUSAR
                        const finalizingStep = progressSteps[5];
                        finalizingStep.classList.remove('pending');
                        finalizingStep.classList.add('active');
                        finalizingStep.querySelector('.step-icon i').className = 'fa-solid fa-spinner';
                        
                        // Aguardar 800ms mostrando "Finalizando"
                        await new Promise(resolve => setTimeout(resolve, 800));
                        
                        // Completar última etapa
                        finalizingStep.classList.remove('active');
                        finalizingStep.classList.add('completed');
                        finalizingStep.querySelector('.step-icon i').className = 'fa-solid fa-check';
                        
                        // Aguardar 400ms para mostrar conclusão visual
                        setTimeout(() => {
                            thinkingDiv.remove();
                            
                            // Adicionar resposta da IA ao chat COM REACT RENDERER
                            const aiMessageDiv = document.createElement('div');
                            aiMessageDiv.className = 'message-container';
                            chatMessages.appendChild(aiMessageDiv);
                            
                            // Usar React Renderer
                            if (window.renderAIMessage) {
                                window.renderAIMessage(data.response, aiMessageDiv);
                            } else {
                                // Fallback se React não carregar
                                aiMessageDiv.className = 'message ai';
                                aiMessageDiv.textContent = data.response;
                            }
                            
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }, 400);
                    } else {
                        thinkingDiv.remove();
                        alert('Erro na resposta da IA');
                    }
                } catch (error) {
                    clearInterval(progressInterval);
                    thinkingDiv.remove();
                    console.error('Erro ao enviar mensagem:', error);
                    alert('Erro de conexão: ' + error.message);
                }

                // Limpar arquivos após envio
                fileInputs.forEach(input => input.value = '');
                updateDocumentsIndicator();
            }
        });

        // Permitir envio com Enter (sem Shift para nova linha)
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });
    }

    // ========== BUSCA DE EMPRESA ==========
    const searchBtn = document.getElementById('search-btn');
    const companySearch = document.getElementById('company-search');
    const companyCards = document.getElementById('company-cards');

    if (searchBtn && companySearch && companyCards) {
        searchBtn.addEventListener('click', async () => {
            const initialText = document.getElementById('initial-text');
            if (initialText) {
                initialText.style.display = 'none';
            }
            const companyName = companySearch.value.trim();
            if (!companyName) return;
            
            // Limpar cards e mostrar loading
            companyCards.innerHTML = '';
            if (window.renderLoadingIndicator) {
                window.renderLoadingIndicator(companyCards);
            }
            
            // Buscar com mínimo de 2 segundos
            const fetchPromise = fetchCompanyIndicatorsByName(companyName);
            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
                const [data] = await Promise.all([fetchPromise, timeoutPromise]);
                
                if (data) {
                    // Limpar loading e renderizar card da empresa
                    companyCards.innerHTML = '';
                    window.renderCompanyCards([{ name: data.name, ticker: data.ticker, variation: data.variation }], companyCards);
                    
                    // Pausar atualizações dos cards para permitir interação
                    pauseCardUpdates();
                    
                    // Rolagem suave
                    companyCards.scrollIntoView({ behavior: 'smooth' });
                } else {
                    // Erro
                    companyCards.innerHTML = '';
                    alert('Empresa não encontrada ou erro na busca.');
                }
            } catch (error) {
                // Tratamento de erro
                companyCards.innerHTML = '';
                console.error('Erro ao buscar indicadores:', error);
                alert('Erro ao buscar indicadores.');
            }
        });
        
        // Permitir busca com Enter
        companySearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') searchBtn.click();
        });
    }

    // ========== MODAIS DE EDIÇÃO DE PERFIL ==========
    const editBlockModal = document.getElementById('edit-block-modal');
    const editSingleModal = document.getElementById('edit-single-modal');
    const saveBlockBtn = document.getElementById('save-block-btn');
    const saveSingleBtn = document.getElementById('save-single-btn');
    const closeEditModal = document.getElementById('close-edit-modal');
    const closeSingleModal = document.getElementById('close-single-modal');

    window.openEditBlockModal = function(blockIndex) {
        currentBlock = blockIndex + 1;
        const form = document.getElementById('edit-block-form');
        form.innerHTML = '';  // Limpar
        
        // Buscar template HTML correspondente
        const templateId = `block${currentBlock}-fields`;
        const template = document.getElementById(templateId);
        
        if (template) {
            // Clonar conteúdo do template
            const content = template.content.cloneNode(true);
            form.appendChild(content);
            
            // Preencher valores existentes se houver
            const blockData = userProfile[`bloco${currentBlock}`] || {};
            Object.keys(blockData).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) {
                    if (input.type === 'checkbox') {
                        const values = Array.isArray(blockData[key]) ? blockData[key] : [blockData[key]];
                        const checkboxes = form.querySelectorAll(`[name="${key}[]"]`);
                        checkboxes.forEach(cb => {
                            if (values.includes(cb.value)) cb.checked = true;
                        });
                    } else {
                        input.value = blockData[key];
                    }
                }
            });
        } else {
            form.innerHTML = '<p>Template não encontrado para este bloco.</p>';
        }
        
        editBlockModal.style.display = 'flex';
    };

    window.openEditSingleModal = function(blockIndex, key) {
        currentBlock = blockIndex + 1;
        currentKey = key;
        const form = document.getElementById('edit-single-form');
        form.innerHTML = `<input name="${key}" value="${userProfile[`bloco${currentBlock}`][key] || ''}">`;
        editSingleModal.style.display = 'flex';
    };

    saveBlockBtn.addEventListener('click', () => {
        const form = document.getElementById('edit-block-form');
        const formData = new FormData(form);
        const data = {};

        // Coletar valores únicos
        for (let [key, value] of formData.entries()) {
            if (!key.includes('[]')) {
                data[key] = value;
            }
        }

        // Coletar múltipla escolha (checkboxes)
        const checkboxes = form.querySelectorAll('input[type="checkbox"]:checked');
        checkboxes.forEach(cb => {
            const name = cb.name.replace('[]', '');
            if (!data[name]) data[name] = [];
            data[name].push(cb.value);
        });

        if (currentBlock === 1) {
            userProfile.bloco1 = data;
        } else if (currentBlock === 2) {
            userProfile.bloco2 = data;
        } else if (currentBlock === 3) {
            userProfile.bloco3 = data;
        } else if (currentBlock === 4) {
            userProfile.bloco4 = data;
        } else if (currentBlock === 5) {
            userProfile.bloco5 = data;
        } else if (currentBlock === 6) {
            userProfile.bloco6 = data;
        } else if (currentBlock === 7) {
            userProfile.bloco7 = data;
        }

        saveProfile();
        editBlockModal.style.display = 'none';
        if (window.renderProfilePage) window.renderProfilePage(userProfile, document.getElementById('profile-content'));
    });

    saveSingleBtn.addEventListener('click', () => {
        const form = document.getElementById('edit-single-form');
        const formData = new FormData(form);
        if (currentBlock && currentKey) {
            userProfile[`bloco${currentBlock}`][currentKey] = formData.get(currentKey);
        }
        saveProfile();
        editSingleModal.style.display = 'none';
        if (window.renderProfilePage) window.renderProfilePage(userProfile, document.getElementById('profile-content'));
    });

    closeEditModal.addEventListener('click', () => editBlockModal.style.display = 'none');
    closeSingleModal.addEventListener('click', () => editSingleModal.style.display = 'none');

   


    // ========== INICIALIZAÇÃO ==========
    switchPage('chat');
    startCardUpdates();
    renderSuggestionsCarousel();
});