// ==========================================
// REACT MESSAGE RENDERER - STANDALONE
// ==========================================

(function() {
    'use strict';

    const { useState, useEffect, useRef } = React;

    const getApiUrl = () => {
    // Se estiver em produção (Render)
    if (window.location.hostname === 'merfin-home.onrender.com') {
        return 'https://merfin-home.onrender.com';
    }
    // Se estiver em desenvolvimento local
    return 'http://localhost:3000'; // ou a porta que você usa
};

const API_URL = getApiUrl();

    // ==========================================
// COMPONENTE: MiniChatModal
// Modal para mini-chat nos indicadores
// ==========================================
const MiniChatModal = ({ category, companyIndices, onClose }) => {  // Mudança: prop 'category' ao invés de 'indicator'
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [showExplainButton, setShowExplainButton] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);  // NOVO: Estado para controlar expansão
    const messagesEndRef = useRef(null);


    const sendMessage = async (message) => {
        if (!message.trim()) return;
        setIsLoading(true);
        setIsThinking(true);
        setShowExplainButton(false);

        setMessages(prev => [...prev, { role: 'user', content: message }]);

        // Mudança: Contexto com todos os indicadores da categoria
        const context = { 
            focusedIndicators: category.indicators,  // Todos os indicadores do bloco
            allIndicators: companyIndices.categories 
        };

        try {
            const response = await fetch(`${API_URL}/chat`, {  // MUDANÇA: adiciona API_URL
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context })
});
            const data = await response.json();
            if (data.response) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
                const chatMessages = document.getElementById('messages');
                if (chatMessages && window.renderAIMessage) {
                    const aiDiv = document.createElement('div');
                    aiDiv.className = 'message-container';
                    chatMessages.appendChild(aiDiv);
                    window.renderAIMessage(data.response, aiDiv);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            } else {
                alert('Erro na resposta da IA');
            }
        } catch (error) {
            console.error('Erro no mini-chat:', error);
            alert('Erro de conexão');
        }
        setIsLoading(false);
        setIsThinking(false);
        setInputValue('');
    };

    const handleExplain = () => {
        const explainText = `Analise o ${category.name} da ${companyIndices.name}`;  // Mudança: usa category.name
        setInputValue(explainText);
        sendMessage(explainText);
    };

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    return React.createElement('div', {
        style: {
            position: 'fixed',
            top: isExpanded ? '2.5%' : '50%',  // AJUSTADO: Centraliza em 2.5% para 95% de largura/altura
            left: isExpanded ? '2.5%' : '50%',
            transform: isExpanded ? 'none' : 'translate(-50%, -50%)',
            width: isExpanded ? '95vw' : '650px',  // MUDADO: 95% da largura da tela
            height: isExpanded ? '90vh' : '520px',  // MUDADO: 95% da altura da tela
            background: 'rgba(30, 30, 30, 0.95)',
            border: '1px solid rgba(173, 216, 230, 0.2)',
            borderRadius: isExpanded ? 0 : '12px',
            padding: isExpanded ? '20px' : '10px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Poppins', sans-serif",
            color: '#ffffff',
            transition: 'all 0.3s ease'  // Suave transição para expansão
        }
    },
        // Botões no topo (fechar e expandir)
        React.createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: isExpanded ? '20px' : '10px'
            }
        },
            // Botão expandir (toggle)
            React.createElement('button', {
                onClick: () => setIsExpanded(!isExpanded),
                style: {
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: isExpanded ? '24px' : '20px',
                    cursor: 'pointer',
                    padding: '0',
                    marginRight: '10px'
                },
                title: isExpanded ? 'Comprimir' : 'Expandir'
            }, React.createElement('i', { className: isExpanded ? 'fas fa-compress' : 'fas fa-expand' })),
            
            // Botão fechar
            React.createElement('button', {
                onClick: onClose,
                style: {
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: isExpanded ? '24px' : '20px',
                    cursor: 'pointer',
                    padding: '0'
                }
            }, '×')
        ),
        
        // Lista de mensagens
        React.createElement('div', {
            className: 'minichat-messages',
            style: {
                flex: 1,
                overflowY: 'auto',
                marginBottom: isExpanded ? '20px' : '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: isExpanded ? '15px' : '10px',
                paddingRight: '5px'
            }
        }, 
            messages.map((msg, idx) =>
                React.createElement('div', {
                    key: idx,
                    className: msg.role === 'user' ? 'minichat-message-user' : 'minichat-message-ai',
                    style: {
                        fontSize: isExpanded ? '16px' : '14px',
                        padding: isExpanded ? '16px' : '12px',
                        maxWidth: msg.role === 'user' ? (isExpanded ? '60%' : '70%') : (isExpanded ? '95%' : '90%')
                    }
                },
                    msg.role === 'assistant' 
                        ? React.createElement(MessageRenderer, { content: msg.content, role: 'ai' })
                        : msg.content
                )
            ),
            React.createElement('div', { ref: messagesEndRef })
        ),
        
        // Indicador de pensando
        isThinking && React.createElement('div', {
            className: 'minichat-thinking',
            style: {
                fontSize: isExpanded ? '16px' : '14px',
                padding: isExpanded ? '12px 16px' : '8px 12px',
                animation: 'pulse 1.5s ease-in-out infinite'  // Adiciona animação de pulso persistente
            }
        }, 'O Merfin leva um pouco mais de tempo para te entregar a melhor análise'),

        
        // Botão "Explique esse índice"
        showExplainButton && React.createElement('div', { 
            style: { 
                display: 'flex', 
                justifyContent: 'center', 
                marginBottom: isExpanded ? '20px' : '10px'
            } 
        },
            React.createElement('button', {
                onClick: handleExplain,
                disabled: isLoading,
                style: {
                    background: 'rgba(255, 215, 0, 0.1)',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    color: '#FFD700',
                    padding: isExpanded ? '12px 20px' : '8px 16px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: isExpanded ? '16px' : '13px',
                    borderRadius: '6px',
                    opacity: isLoading ? 0.5 : 0.8,
                    transition: 'all 0.2s'
                }
            }, `Analise o ${category.name} da ${companyIndices.name}`)  // Mudança: texto do botão
        ),
        
        // Input e botão enviar
        React.createElement('div', { 
            style: { 
                display: 'flex', 
                alignItems: 'center',
                gap: isExpanded ? '15px' : '10px',
                paddingTop: isExpanded ? '20px' : '10px',
                borderTop: '1px solid rgba(173, 216, 230, 0.1)'
            } 
        },
            React.createElement('input', {
                type: 'text',
                value: inputValue,
                onChange: (e) => setInputValue(e.target.value),
                onKeyPress: (e) => {
                    if (e.key === 'Enter' && !isLoading) {
                        sendMessage(inputValue);
                    }
                },
                placeholder: 'Digite sua mensagem...',
                disabled: isLoading,
                style: {
                    flex: 1,
                    padding: isExpanded ? '16px' : '12px',
                    border: '1px solid rgba(173, 216, 230, 0.3)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    color: '#ffffff',
                    fontSize: isExpanded ? '16px' : '14px',
                    borderRadius: '20px',
                    outline: 'none',
                    fontFamily: "'Poppins', sans-serif"
                }
            }),
            React.createElement('button', {
                onClick: () => sendMessage(inputValue),
                disabled: isLoading || !inputValue.trim(),
                style: {
                    background: isLoading || !inputValue.trim() ? '#555' : '#FFD700',
                    border: 'none',
                    color: '#000',
                    padding: isExpanded ? '16px 24px' : '12px 20px',
                    cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                    fontSize: isExpanded ? '16px' : '14px',
                    borderRadius: '20px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                }
            }, isLoading ? '...' : 'Enviar')
        )
    );
};

    // ==========================================
    // COMPONENTE: ChartRenderer (para gráficos no modal)
    // ==========================================
    const ChartRenderer = ({ data }) => {
        const chartRef = useRef(null);
        const chartInstance = useRef(null);

        useEffect(() => {
            if (chartRef.current && data) {
                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }
                chartInstance.current = new Chart(chartRef.current, {
                    type: 'line',
                    data: data,
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'top',
                            },
                            title: {
                                display: true,
                                text: 'Evolução Histórica'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }
            return () => {
                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }
            };
        }, [data]);

        return React.createElement('canvas', { ref: chartRef });
    };

    // ==========================================
    // COMPONENTE: CompanyCards
    // Renderiza 3 cards de empresas com dados dinâmicos
    // ==========================================
    const CompanyCards = ({ companies }) => {
        if (!companies || companies.length === 0) return null;
        return React.createElement('div', { className: 'company-cards-container' },
            companies.map((company, index) =>
                React.createElement('div', {
                    key: company.ticker || index,
                    className: 'company-card',
                    onMouseEnter: () => window.pauseCardUpdates && window.pauseCardUpdates(),
                    onMouseLeave: () => setTimeout(() => window.resumeCardUpdates && window.resumeCardUpdates(), 2000)
                },
                    React.createElement('div', { className: 'card-content' },
                        React.createElement('h3', null, company.name),
                        React.createElement('p', { className: 'ticker' }, company.ticker),
                        React.createElement('p', {
                            className: 'variation',
                            style: { 
                                color: company.variation >= 0 ? '#00a100ff' : '#dd0000ff'
                            }
                        }, company.variation !== null ? 
                            (company.variation >= 0 ? '+' : '-') + Math.abs(company.variation).toFixed(2) + '%' : 
                            'Não disponível'
                        )
                    ),
                    React.createElement('div', { className: 'hover-content' },
                        React.createElement('p', { className: 'hover-ticker' }, company.ticker),
                        React.createElement('button', { 
                            className: 'research-btn',
                            onClick: () => window.researchCompany && window.researchCompany(company.ticker)
                        }, 'Research')
                    )
                )
            )
        );
    };

    // ==========================================
    // FUNÇÃO GLOBAL: Renderizar cards de empresas
    // Exposta para uso no app.js
    // ==========================================
    window.renderCompanyCards = function(companies, containerElement) {
        const root = ReactDOM.createRoot(containerElement);
        root.render(React.createElement(CompanyCards, { companies: companies }));
    };

    // ==========================================
// COMPONENTE: LoadingIndicator
// Exibe ícone animado e textos dinâmicos durante carregamento
// ==========================================
const LoadingIndicator = () => {
    const [message, setMessage] = useState('Estamos colhendo os dados...');
    const messages = [
        'Estamos colhendo os dados...',
        'Processando informações...',
        'Analisando indicadores...',
        'Quase pronto...'
    ];
    let messageIndex = 0;

    useEffect(() => {
        const interval = setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            setMessage(messages[messageIndex]);
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return React.createElement('div', {
        style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            textAlign: 'center'
        }
    },
        React.createElement('i', {
            className: 'fas fa-chart-line',  // Ícone de gráfico de linha para representar dados financeiros
            style: {
                fontSize: '38px',
                color: '#FFD700',
                animation: 'spin 1s linear infinite'
            }
        }),
        React.createElement('p', {
            style: {
                color: '#ffffff',
                fontSize: '16px',
                margin: '10px 0 0 0',
                fontFamily: "'Poppins', sans-serif"
            }
        }, message)
    );
};

// ==========================================
// FUNÇÃO GLOBAL: Renderizar indicador de carregamento
// ==========================================
window.renderLoadingIndicator = function(containerElement) {
    const root = ReactDOM.createRoot(containerElement);
    root.render(React.createElement(LoadingIndicator));
};

    // ==========================================
    // COMPONENTE: CodeBlock
    // Renderiza blocos de código com syntax highlighting
    // ==========================================
    const CodeBlock = ({ code, language }) => {
        const codeRef = useRef(null);

        useEffect(() => {
            if (codeRef.current && window.hljs) {
                hljs.highlightElement(codeRef.current);
            }
        }, [code, language]);

        return React.createElement('pre', { className: 'code-block' },
            React.createElement('code', { 
                ref: codeRef,
                className: `language-${language || 'plaintext'}` 
            }, code)
        );
    };

    // ==========================================
    // COMPONENTE: TableRenderer
    // Renderiza tabelas markdown com estilo
    // ==========================================
    const TableRenderer = ({ headers, rows }) => {
        return React.createElement('div', { className: 'table-wrapper' },
            React.createElement('table', { className: 'markdown-table' },
                React.createElement('thead', null,
                    React.createElement('tr', null,
                        headers.map((header, i) => 
                            React.createElement('th', { key: i }, header)
                        )
                    )
                ),
                React.createElement('tbody', null,
                    rows.map((row, i) =>
                        React.createElement('tr', { key: i },
                            row.map((cell, j) =>
                                React.createElement('td', { key: j }, cell)
                            )
                        )
                    )
                )
            )
        );
    };

    // ==========================================
    // FUNÇÃO: Detectar e parsear gráficos
    // ==========================================
    function detectChart(text) {
        // Procura por blocos JSON marcados como gráfico
        const chartRegex = /```chart\s*\n([\s\S]*?)\n```/g;
        const match = chartRegex.exec(text);
        
        if (match) {
            try {
                const chartData = JSON.parse(match[1]);
                return {
                    found: true,
                    data: chartData,
                    originalText: match[0]
                };
            } catch (e) {
                console.error('Erro ao parsear dados do gráfico:', e);
            }
        }
        
        return { found: false };
    }

    // ==========================================
    // FUNÇÃO: Parsear tabelas markdown
    // ==========================================
    function parseMarkdownTable(text) {
        const tableRegex = /\n\|(.+)\|\n\|[-:| ]+\|\n((?:\|.+\|\n?)+)/g;
        const matches = [...text.matchAll(tableRegex)];
        
        return matches.map(match => {
            const headers = match[1].split('|').map(h => h.trim()).filter(h => h);
            const rowsText = match[2].trim().split('\n');
            const rows = rowsText.map(row => 
                row.split('|').map(c => c.trim()).filter(c => c)
            );
            
            return {
                headers,
                rows,
                originalText: match[0]
            };
        });
    }

    // ==========================================
    // COMPONENTE PRINCIPAL: MessageRenderer
    // ==========================================
    const MessageRenderer = ({ content, role }) => {
        const [parsedContent, setParsedContent] = useState([]);

        useEffect(() => {
            const elements = [];
            let remainingText = content;

            // 1. Detectar e extrair gráficos
            const chartDetection = detectChart(remainingText);
            if (chartDetection.found) {
                const parts = remainingText.split(chartDetection.originalText);
                
                if (parts[0].trim()) {
                    elements.push({ type: 'markdown', content: parts[0] });
                }
                
                elements.push({ type: 'chart', data: chartDetection.data });
                
                remainingText = parts[1] || '';
            }

            // 2. Detectar e extrair tabelas
            const tables = parseMarkdownTable(remainingText);
            if (tables.length > 0) {
                tables.forEach(table => {
                    const parts = remainingText.split(table.originalText);
                    
                    if (parts[0].trim()) {
                        elements.push({ type: 'markdown', content: parts[0] });
                    }
                    
                    elements.push({ 
                        type: 'table', 
                        headers: table.headers, 
                        rows: table.rows 
                    });
                    
                    remainingText = parts[1] || '';
                });
            }

            // 3. Adicionar texto restante
            if (remainingText.trim()) {
                elements.push({ type: 'markdown', content: remainingText });
            }

            // Se não houver elementos especiais, apenas markdown
            if (elements.length === 0) {
                elements.push({ type: 'markdown', content: content });
            }

            setParsedContent(elements);
        }, [content]);

        // Renderizar markdown com marked.js
        const renderMarkdown = (text) => {
            if (!window.marked) return text;
            
            // Configurar marked para usar highlight.js
            marked.setOptions({
                highlight: function(code, lang) {
                    if (window.hljs && lang && hljs.getLanguage(lang)) {
                        try {
                            return hljs.highlight(code, { language: lang }).value;
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    return code;
                },
                breaks: true,
                gfm: true
            });

            return marked.parse(text);
        };

        return React.createElement('div', { className: `message ${role}` },
            parsedContent.map((element, index) => {
                switch (element.type) {
                    case 'chart':
                        return React.createElement(ChartRenderer, { 
                            key: index, 
                            data: element.data 
                        });
                    
                    case 'table':
                        return React.createElement(TableRenderer, {
                            key: index,
                            headers: element.headers,
                            rows: element.rows
                        });
                    
                    case 'markdown':
                    default:
                        return React.createElement('div', {
                            key: index,
                            className: 'markdown-content',
                            dangerouslySetInnerHTML: { 
                                __html: renderMarkdown(element.content) 
                            }
                        });
                }
            })
        );
    };

    // ==========================================
    // FUNÇÃO GLOBAL: Renderizar mensagem
    // Exposta para uso no app.js
    // ==========================================
    window.renderAIMessage = function(content, containerElement) {
        const root = ReactDOM.createRoot(containerElement);
        root.render(React.createElement(MessageRenderer, { 
            content: content, 
            role: 'ai' 
        }));
    };

    // ==========================================
    // COMPONENTE: IndicatorsGrid
    // Renderiza indicadores em grids de 2x2 blocos com animações
    // ==========================================
    const IndicatorsGrid = ({ companies }) => {
    const [modalData, setModalData] = useState(null);
    const [tooltip, setTooltip] = useState(null);
    const [showNotification, setShowNotification] = useState(false);  // Novo: Estado para notificação

    if (!companies || companies.length === 0) return null;

    // Novo: useEffect para mostrar notificação após 3 segundos
    useEffect(() => {
        const timer = setTimeout(() => setShowNotification(true), 3000);
        return () => clearTimeout(timer);
    }, []);

    const closeModal = () => setModalData(null);

    const openModal = (indicator) => {
        if (indicator.history && indicator.history.length > 0) {
            setModalData({
                type: 'chart',  // ADICIONADO: Define tipo para ativar o modal, sem interferir no render dos indicadores
                title: `${indicator.label} - Evolução Histórica`,
                data: {
                    labels: indicator.history.map(h => h.year),
                    datasets: [{
                        label: indicator.label,
                        data: indicator.history.map(h => parseFloat(h.value.replace(/[^\d.-]/g, '')) || 0),
                        borderColor: '#ADD8E6',
                        backgroundColor: 'rgba(173, 216, 230, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                }
            });
        }
    };

    const openMiniChat = (category, company) => {
        setModalData({ type: 'minichat', category, company });
    };

    const showTooltip = (text, event) => {
        const rect = event.target.getBoundingClientRect();
        setTooltip({
            text,
            x: rect.left + rect.width / 2,
            y: rect.top - 10
        });
    };

    const hideTooltip = () => setTooltip(null);

    const renderCategoryGrids = (category, company) => {
        const indicators = category.indicators;
        if (category.name === 'Outros') {
            const parts = 3;
            const indicatorsPerPart = Math.ceil(indicators.length / parts);
            const grids = [];
            for (let i = 0; i < parts; i++) {
                const start = i * indicatorsPerPart;
                const end = Math.min(start + indicatorsPerPart, indicators.length);
                const partIndicators = indicators.slice(start, end);
                grids.push(
                    React.createElement('div', { 
                        className: 'category-indicators',
                        onClick: () => openMiniChat(category, company)  // Mudança: onClick no bloco da categoria
                    },
                        partIndicators.map((ind, idx) =>
                            React.createElement('div', {
                                key: idx,
                                className: 'indicator-row'
                                // Removido: onClick do indicador individual
                            },
                                React.createElement('div', { className: 'indicator-left' },
                                    React.createElement('span', { className: 'indicator-label' }, ind.label),
                                    React.createElement('div', { className: 'indicator-icons' },
                                        React.createElement('i', {
                                            className: 'fas fa-info-circle info-icon',
                                            title: ind.description || 'Descrição não disponível',
                                            onMouseEnter: (e) => showTooltip(ind.description || 'Descrição não disponível', e),
                                            onMouseLeave: hideTooltip
                                        }),
                                        ind.history && ind.history.length > 0 ? React.createElement('i', {
                                            className: 'fas fa-chart-line chart-icon',
                                            onClick: (e) => { e.stopPropagation(); openModal(ind); }
                                        }) : null
                                    )
                                ),
                                React.createElement('div', { className: 'indicator-right' },
                                    React.createElement('span', { className: 'indicator-value' }, ind.value)
                                )
                            )
                        )
                    )
                );
            }
            return React.createElement('div', { className: 'outros-grid' }, grids);
        } else {
            return React.createElement('div', { 
                className: 'category-indicators',
                onClick: () => openMiniChat(category, company)  // Mudança: onClick no bloco da categoria
            },
                indicators.map((ind, idx) =>
                    React.createElement('div', {
                        key: idx,
                        className: 'indicator-row'
                        // Removido: onClick do indicador individual
                    },
                        React.createElement('div', { className: 'indicator-left' },
                            React.createElement('span', { className: 'indicator-label' }, ind.label),
                            React.createElement('div', { className: 'indicator-icons' },
                                React.createElement('i', {
                                    className: 'fas fa-info-circle info-icon',
                                    title: ind.description || 'Descrição não disponível',
                                    onMouseEnter: (e) => showTooltip(ind.description || 'Descrição não disponível', e),
                                    onMouseLeave: hideTooltip
                                }),
                                ind.history && ind.history.length > 0 ? React.createElement('i', {
                                    className: 'fas fa-chart-line chart-icon',
                                    onClick: (e) => { e.stopPropagation(); openModal(ind); }
                                }) : null
                            )
                        ),
                        React.createElement('div', { className: 'indicator-right' },
                            React.createElement('span', { className: 'indicator-value' }, ind.value)
                        )
                    )
                )
            );
        }
    };

    return React.createElement('div', { className: 'indicators-container' },
        companies.map(company =>
            React.createElement('div', { key: company.ticker, className: 'indicators-card' },
                React.createElement('h3', null, `${company.name} (${company.ticker})`),
                company.categories && React.createElement('div', { className: 'categories-grid' },
                    company.categories.map(category =>
                        React.createElement('div', { key: category.name, className: 'category-section' },
                            React.createElement('h4', { className: 'category-title' }, `Indicadores de ${category.name}`),
                            React.createElement('p', { className: 'category-description' }, category.description),
                            renderCategoryGrids(category, company)
                        )
                    )
                )
            )
        ),
        // Novo: Notificação
        showNotification && React.createElement('div', { className: 'notification' },
            'Clique nos blocos dos indicadores para abrir o Merfin! e tirar suas dúvidas',
            React.createElement('button', {
                onClick: () => setShowNotification(false),
                title: 'Fechar'
            }, '×')
        ),
        // Modais com verificação segura para evitar interferências
        modalData && modalData.type === 'chart' && React.createElement('div', { className: 'modal-overlay', onClick: closeModal },
            React.createElement('div', { className: 'modal-content', onClick: (e) => e.stopPropagation() },
                React.createElement('h4', null, modalData.title),
                React.createElement(ChartRenderer, { data: modalData.data }),
                React.createElement('button', { className: 'modal-close', onClick: closeModal }, 'Fechar')
            )
        ),
        modalData && modalData.type === 'minichat' && React.createElement(MiniChatModal, {
            category: modalData.category,  // Mudança: passa 'category' ao invés de 'indicator'
            companyIndices: modalData.company,
            onClose: closeModal
        }),
        tooltip && React.createElement('div', {
            className: 'tooltip',
            style: { left: tooltip.x, top: tooltip.y }
        }, tooltip.text)
    );
};

// ==========================================
// COMPONENTE: ProfileCarousel (Carrossel Inicial)
// ==========================================
const ProfileCarousel = ({ onStartEditing }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const blocks = [
        { title: "CONTEXTO FINANCEIRO E PATRIMONIAL", desc: "Entenda sua base patrimonial..." },
        { title: "OBJETIVOS E HORIZONTE DE TEMPO", desc: "Identifique para quê e quando o dinheiro será usado..." },
        { title: "EXPERIÊNCIA E CONHECIMENTO", desc: "Calibre a linguagem e profundidade da análise..." },
        { title: "TOLERÂNCIA AO RISCO E COMPORTAMENTO", desc: "Entenda como você reage a oscilações..." },
        { title: "ESTILO DE ACOMPANHAMENTO E DECISÃO", desc: "Saiba como você interage com seus investimentos..." },
        { title: "PREFERÊNCIAS E RESTRIÇÕES", desc: "Capture preferências pessoais e restrições..." }
    ];
    return React.createElement('div', { className: 'profile-carousel' },
        React.createElement('div', {
            className: 'carousel-slide',
            style: { transform: `translateX(-${currentIndex * 100}%)` }
        },
            blocks.map((block, i) =>
                React.createElement('div', { key: i, className: 'carousel-item' },
                    React.createElement('h3', null, block.title),
                    React.createElement('p', null, block.desc),
                    React.createElement('button', { onClick: () => onStartEditing(i) }, 'Começar a Preencher')
                )
            )
        ),
        React.createElement('button', {
            onClick: () => setCurrentIndex((currentIndex - 1 + blocks.length) % blocks.length)
        }, '‹'),
        React.createElement('button', {
            onClick: () => setCurrentIndex((currentIndex + 1) % blocks.length)
        }, '›')
    );
};

// ==========================================
// COMPONENTE: ProfileBlocks (6 Blocos Após Preenchimento)
// ==========================================
const ProfileBlocks = ({ profile, onEditBlock, onEditSingle }) => {
    const blockTitles = [
        "CONTEXTO FINANCEIRO E PATRIMONIAL",
        "OBJETIVOS E HORIZONTE DE TEMPO",
        "EXPERIÊNCIA E CONHECIMENTO",
        "TOLERÂNCIA AO RISCO E COMPORTAMENTO",
        "ESTILO DE ACOMPANHAMENTO E DECISÃO",
        "PREFERÊNCIAS E RESTRIÇÕES"
    ];
    return React.createElement('div', { className: 'profile-blocks' },
        blockTitles.map((title, i) =>
            React.createElement('div', { key: i, className: 'profile-block' },
                React.createElement('h3', null, title),
                Object.entries(profile[`bloco${i+1}`] || {}).map(([key, val]) =>
                    React.createElement('p', {
                        key: key,
                        onClick: () => onEditSingle(i, key)
                    }, val)
                ),
                React.createElement('button', { onClick: () => onEditBlock(i) }, 'Editar')
            )
        )
    );
};

// ==========================================
// COMPONENTE PRINCIPAL: ProfilePage
// ==========================================
const ProfilePage = ({ profile }) => {
    const handleEditBlock = (blockIndex) => {
        if (window.openEditBlockModal) window.openEditBlockModal(blockIndex);
    };
    const handleEditSingle = (blockIndex, key) => {
        if (window.openEditSingleModal) window.openEditSingleModal(blockIndex, key);
    };
    return React.createElement(ProfileBlocks, { profile: profile, onEditBlock: handleEditBlock, onEditSingle: handleEditSingle });
};

// ==========================================
// FUNÇÃO GLOBAL: Renderizar Página de Perfil
// ==========================================
window.renderProfilePage = function(profile, containerElement) {
    const root = ReactDOM.createRoot(containerElement);
    root.render(React.createElement(ProfilePage, { profile: profile }));
};


    // ==========================================
    // FUNÇÃO GLOBAL: Renderizar grid de indicadores
    // Substitui renderIndicatorsTable
    // ==========================================
    window.renderIndicatorsTable = function(companies, containerElement) {
        const root = ReactDOM.createRoot(containerElement);
        root.render(React.createElement(IndicatorsGrid, { companies: companies }));
    };

    console.log('✅ React Renderer carregado com sucesso!');
})();