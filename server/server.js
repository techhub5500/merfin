import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import winston from 'winston';
import 'dotenv/config';
import OpenAI from 'openai';  // Mantém o SDK OpenAI, mas configurado para DeepSeek
import multer from 'multer';
import fs from 'fs';
import axios from 'axios';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const app = express();
const PORT = process.env.PORT || 3000;
const NEWS_SITES = ['infomoney.com.br', 'valor.com.br', 'bloomberg.com', 'wsj.com', 'ft.com'];

// Logging com Winston
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

const upload = multer({ dest: 'uploads/' });

const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? [
            'https://merfin-home.onrender.com',      // ✅ Frontend
            'https://merfin-server.onrender.com',    // ✅ Servidor principal
            'https://merfin-dado.onrender.com'       // ✅ Servidor de dados
          ]
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true, // ✅ CRÍTICO para sessões
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[DEBUG] Request from:', req.headers.origin);
    console.log('[DEBUG] Cookies received:', req.headers.cookie);
    console.log('[DEBUG] Method:', req.method, req.path);
    next();
});

app.use(express.static(path.join(__dirname, '../client')));

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Conectado ao MongoDB');
        logger.info('Conectado ao MongoDB');
    })
    .catch(err => {
        console.error('Erro ao conectar ao MongoDB:', err);
        logger.error('Erro ao conectar ao MongoDB:', err);
    });


const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    cpf: { type: String, required: true, unique: true },  // Já adicionado anteriormente
    telefone: { type: String, required: true },  // Já adicionado anteriormente
    assinatura: { type: String, enum: ['ativa', 'inativa', 'pendente'], default: 'ativa' }  // Novo campo
});

const User = mongoose.model('User', userSchema);

const chatSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    messages: [{ role: String, content: String, timestamp: { type: Date, default: Date.now } }],
    createdAt: { type: Date, default: Date.now }
});

// Índices para performance
chatSchema.index({ user: 1, createdAt: -1 });


// Índice TTL para excluir chats automaticamente após 10 dias
chatSchema.index({ createdAt: 1 }, { expireAfterSeconds: 10 * 24 * 60 * 60 }); // 10 dias em segundos

const Chat = mongoose.model('Chat', chatSchema);


const profileSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    profileData: { type: Object, default: {} },  // Armazena os blocos (bloco1, bloco2, etc.)
    updatedAt: { type: Date, default: Date.now }
});

const Profile = mongoose.model('Profile', profileSchema);

app.use(helmet()); // Segurança: headers de proteção
app.use(express.json({ limit: '10mb' })); // Limite de payload

// Rate Limiting: 100 requisições por 15 minutos por IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,    max: 100,    message: 'Muitas requisições, tente novamente mais tarde.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Sessões com MongoDB Store
app.set('trust proxy', 1);

// Sessões com MongoDB Store
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_super_secret_key',
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// ✅ MIDDLEWARE DE DEBUG (ADICIONAR)
app.use((req, res, next) => {
    console.log('[DEBUG] Session ID:', req.sessionID);
    console.log('[DEBUG] Session User:', req.session?.user);
    console.log('[DEBUG] Session Cookie:', req.session?.cookie);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    next();
});

function summarizeProfile(profileData) {
    if (!profileData || Object.keys(profileData).length === 0) {
        return "Perfil não cadastrado.";
    }
    let summary = "Perfil do usuário: ";
    // Bloco1: Básico (patrimônio, aportes)
    if (profileData.bloco1) {
        summary += `Patrimônio: ${profileData.bloco1.patrimonio || 'N/A'}, Aportes: ${profileData.bloco1.aportes || 'N/A'}. `;
    }
    // Bloco2: Objetivos (ex.: renda, crescimento)
    if (profileData.bloco2) {
        summary += `Objetivos: ${profileData.bloco2.objetivos || 'N/A'}. `;
    }
    // Bloco3: Conhecimento (iniciante, intermediário)
    if (profileData.bloco3) {
        summary += `Conhecimento: ${profileData.bloco3.conhecimento || 'N/A'}. `;
    }
    // Bloco4: Risco (tolerância, volatilidade)
    if (profileData.bloco4) {
        summary += `Tolerância risco: ${profileData.bloco4.tolerancia || 'N/A'}, Volatilidade máxima: ${profileData.bloco4.volatilidade || 'N/A'}. `;
    }
    // Bloco5: Preferências (setores, dividendos)
    if (profileData.bloco5) {
        summary += `Preferências: ${profileData.bloco5.preferencias || 'N/A'}. `;
    }
    // Bloco6: Restrições (ex.: ESG)
    if (profileData.bloco6) {
        summary += `Restrições: ${profileData.bloco6.restricoes || 'N/A'}. `;
    }
    // Limite para ~200 tokens (cerca de 100-150 palavras)
    return summary.substring(0, 500);
}

// Função auxiliar para buscar dados financeiros na BRAPI
const fetchFinancialData = async (ticker, brapiToken, requestedMetrics = [], userRequestedPeriod = null) => {
    try {
        // Sempre buscar módulos completos com dados históricos
        const response = await axios.get(
            `https://brapi.dev/api/quote/${ticker}?range=5d&interval=1d&fundamental=true&dividends=true&modules=summaryProfile,defaultKeyStatistics,financialData,balanceSheetHistoryQuarterly,incomeStatementHistoryQuarterly&token=${brapiToken}`
        );
        
        const data = response.data;
        
        if (!data.results || !data.results[0]) {
            return { 
                success: false, 
                error: 'Ticker não encontrado na BRAPI',
                ticker: ticker 
            };
        }
        
        const result = data.results[0];
        
        // NOVA FUNÇÃO: Determinar período a ser usado (mais recente ou solicitado)
        const determinePeriod = () => {
            // Se usuário especificou período, tentar encontrá-lo
            if (userRequestedPeriod) {
                const match = userRequestedPeriod.match(/Q(\d)\s*(\d{4})/i);
                if (match) {
                    const requestedQuarter = parseInt(match[1]);
                    const requestedYear = parseInt(match[2]);
                    return { quarter: requestedQuarter, year: requestedYear, label: `Q${requestedQuarter} ${requestedYear}` };
                }
                
                // Tentar formato de ano apenas (ex: "2023" → Q4 2023)
                const yearMatch = userRequestedPeriod.match(/(\d{4})/);
                if (yearMatch) {
                    const year = parseInt(yearMatch[1]);
                    return { quarter: 4, year: year, label: `Q4 ${year}` };
                }
            }
            
            // PADRÃO: Usar trimestre mais recente disponível
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth(); // 0-11
            const currentYear = currentDate.getFullYear();
            
            // Calcular trimestre atual com regra de 2 meses
            let targetQuarter, targetYear;
            const monthInQuarter = currentMonth % 3;
            
            if (monthInQuarter < 2) {
                // Menos de 2 meses no trimestre, usar anterior
                const previousQuarter = Math.floor(currentMonth / 3);
                if (previousQuarter === 0) {
                    targetQuarter = 4;
                    targetYear = currentYear - 1;
                } else {
                    targetQuarter = previousQuarter;
                    targetYear = currentYear;
                }
            } else {
                // 2+ meses, usar trimestre atual
                targetQuarter = Math.floor(currentMonth / 3) + 1;
                targetYear = currentYear;
            }
            
            return { quarter: targetQuarter, year: targetYear, label: `Q${targetQuarter} ${targetYear}` };
        };
        
        const targetPeriod = determinePeriod();
        
        // FUNÇÃO: Buscar dados do período específico
        const findDataForPeriod = (historyArray, period) => {
            if (!historyArray || historyArray.length === 0) return null;
            
            return historyArray.find(item => {
                if (!item.endDate) return false;
                const itemDate = new Date(item.endDate);
                const itemQuarter = Math.floor((itemDate.getMonth() + 3) / 3);
                const itemYear = itemDate.getFullYear();
                return itemQuarter === period.quarter && itemYear === period.year;
            });
        };
        
        // Buscar dados do balanço e DRE para o período alvo
        const balanceData = findDataForPeriod(result.balanceSheetHistoryQuarterly, targetPeriod);
        const incomeData = findDataForPeriod(result.incomeStatementHistoryQuarterly, targetPeriod);
        
        // Se período solicitado não foi encontrado, avisar
        if (userRequestedPeriod && (!balanceData && !incomeData)) {
            return {
                success: false,
                error: `Dados do período ${targetPeriod.label} não disponíveis na BRAPI`,
                ticker: ticker,
                availablePeriods: result.balanceSheetHistoryQuarterly?.map(b => {
                    const d = new Date(b.endDate);
                    return `Q${Math.floor((d.getMonth() + 3) / 3)} ${d.getFullYear()}`;
                }).slice(0, 5) || []
            };
        }
        
        // Se nenhuma métrica específica foi solicitada, retornar resumo completo
        if (!requestedMetrics || requestedMetrics.length === 0) {
            const stats = result.defaultKeyStatistics || {};
            const finData = result.financialData || {};
            
            const formattedData = `
Empresa: ${result.longName || result.shortName} (${result.symbol})
Setor: ${result.summaryProfile?.sector || 'N/A'}
**Período de Referência: ${targetPeriod.label}**

**Valuation:**
Market Cap: ${result.marketCap ? `R$ ${(result.marketCap / 1e9).toFixed(2)}B` : 'N/A'}
P/L: ${result.priceEarnings ? result.priceEarnings.toFixed(2) : 'N/A'}
P/VP: ${stats.priceToBook ? stats.priceToBook.toFixed(2) : 'N/A'}
EV/EBITDA: ${stats.enterpriseToEbitda ? stats.enterpriseToEbitda.toFixed(2) : 'N/A'}

**Rentabilidade (${targetPeriod.label}):**
ROE: ${finData.returnOnEquity ? `${(finData.returnOnEquity * 100).toFixed(2)}%` : 'N/A'}
ROA: ${finData.returnOnAssets ? `${(finData.returnOnAssets * 100).toFixed(2)}%` : 'N/A'}
Margem Líquida: ${finData.profitMargins ? `${(finData.profitMargins * 100).toFixed(2)}%` : 'N/A'}
Margem Bruta: ${finData.grossMargins ? `${(finData.grossMargins * 100).toFixed(2)}%` : 'N/A'}

**Endividamento (${targetPeriod.label}):**
Dívida/PL: ${finData.debtToEquity ? finData.debtToEquity.toFixed(2) : 'N/A'}
Liquidez Corrente: ${finData.currentRatio ? finData.currentRatio.toFixed(2) : 'N/A'}

**Dividendos:**
Dividend Yield: ${stats.dividendYield ? `${(stats.dividendYield * 100).toFixed(2)}%` : 'N/A'}

**Resultados (${targetPeriod.label}):**
Receita Total: ${incomeData?.totalRevenue ? `R$ ${(incomeData.totalRevenue / 1e9).toFixed(2)}B` : 'N/A'}
EBITDA: ${incomeData?.ebitda ? `R$ ${(incomeData.ebitda / 1e9).toFixed(2)}B` : 'N/A'}
Lucro Líquido: ${incomeData?.netIncome ? `R$ ${(incomeData.netIncome / 1e9).toFixed(2)}B` : 'N/A'}
            `.trim();
            
            return { 
                success: true, 
                formatted: formattedData,
                period: targetPeriod.label
            };
        }
        
        // MODO DINÂMICO: buscar métricas específicas do período
        const foundMetrics = {};
        const notFoundMetrics = [];
        
        for (const metric of requestedMetrics) {
            const normalizedMetric = normalizeMetricName(metric);
            const brapiPath = BRAPI_METRIC_MAP[normalizedMetric];
            
            if (!brapiPath) {
                notFoundMetrics.push(metric);
                continue;
            }
            
            // Buscar valor do período específico
            let value = null;
            if (brapiPath.includes('balanceSheet') && balanceData) {
                const key = brapiPath.split('.').pop();
                value = balanceData[key];
            } else if (brapiPath.includes('incomeStatement') && incomeData) {
                const key = brapiPath.split('.').pop();
                value = incomeData[key];
            } else {
                value = getNestedValue(result, brapiPath);
            }
            
            if (value !== null && value !== undefined) {
                foundMetrics[metric] = {
                    raw: value,
                    formatted: formatMetricValue(normalizedMetric, value),
                    period: targetPeriod.label
                };
            } else {
                notFoundMetrics.push(metric);
            }
        }
        
        return {
            success: true,
            ticker: result.symbol,
            companyName: result.longName || result.shortName,
            period: targetPeriod.label,
            foundMetrics: foundMetrics,
            notFoundMetrics: notFoundMetrics
        };
        
    } catch (error) {
        console.error('Erro ao buscar dados financeiros:', error.message);
        return { 
            success: false, 
            error: error.message,
            ticker: ticker 
        };
    }
};

async function requestMetricsFromAI(userMessage, companyName) {
    try {
        const metricsPrompt = `Você é Merfin. Para responder a pergunta do usuário sobre ${companyName}, quais métricas financeiras são ESSENCIAIS?

CONTEXTO:
- Seja pragmático: peça apenas dados que realmente impactam sua análise
- Priorize métricas fundamentalistas (valuation, rentabilidade, endividamento, dividendos)
- Se a pergunta for genérica ("como está a empresa?"), liste 5-8 métricas-chave
- Se específica ("qual o ROE?"), liste apenas as relevantes

FORMATO:
Retorne um array JSON simples: ["metrica1", "metrica2", ...]

Mensagem do usuário: "${userMessage}"

Responda APENAS com o array JSON (ex: ["ROE", "P/L", "dividend_yield"]) ou [] se não precisar de dados específicos.`;

        const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
        { 
            role: 'system', 
            content: 'Você é Merfin. Identifique as métricas fundamentalistas essenciais para responder à pergunta. Seja criterioso: peça apenas dados que realmente impactam a análise. Retorne apenas array JSON.' 
        },
        { role: 'user', content: metricsPrompt }
    ],
    max_tokens: 150,
    temperature: 0.3 // ADICIONAR: mais determinístico
});
        
        const content = response.choices[0].message.content.trim();
        
        // Tentar parsear JSON
        try {
            const metrics = JSON.parse(content);
            if (Array.isArray(metrics)) {
                return metrics;
            }
        } catch (e) {
            // Tentar extrair array do texto
            const arrayMatch = content.match(/\[.*?\]/);
            if (arrayMatch) {
                return JSON.parse(arrayMatch[0]);
            }
        }
        
        return []; // Fallback: nenhuma métrica específica
        
    } catch (error) {
        logger.error('Erro ao solicitar métricas da IA:', error);
        return [];
    }
}

async function planResponse(userMessage, conversationContext, profileSummary = "Perfil não cadastrado.") {
    try {
        const hasContext = conversationContext && conversationContext.length > 0;
        const contextSection = hasContext 
            ? `CONTEXTO DA CONVERSA (últimas ${conversationContext.length} mensagens):
${conversationContext.map(m => `${m.role}: ${m.content.substring(0, 200)}`).join('\n')}`
            : `CONTEXTO DA CONVERSA: Este é o PRIMEIRO TURNO de um novo chat.`;

        const planningPrompt = `Você é Merfin. Analise a mensagem e crie um plano estruturado.

PERFIL DO USUÁRIO: ${profileSummary}

${contextSection}

MENSAGEM ATUAL: "${userMessage}"

RETORNE UM JSON:
{
  "raciocinio": "por que esta abordagem",
  "necessita_dados": true/false,
  "tipo_dados": "financeiro" | "macro" | "nenhum",
  "empresa": "nome da empresa ou null",
  "metricas_essenciais": ["ROE", "P/L"] ou null,
  "periodo_especifico": "Q2 2024" ou null (SE O USUÁRIO ESPECIFICAR PERÍODO COMO "Q2 2024", "2023", ETC.),
  "profundidade_tecnica": "iniciante" | "intermediario" | "avancado",
  "tipo_resposta": "analise_completa" | "explicacao_conceitual" | "resposta_rapida",
  "convicção_necessaria": true/false
}

IMPORTANTE:
- Se usuário mencionar período específico (ex: "ROE em 2023", "Q1 2024"), preencha "periodo_especifico"
- Se não mencionar período, deixe null (usará o mais recente)
`;

        const planningResponse = await openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'Você é Merfin planejando resposta. Retorne APENAS JSON.' },
                { role: 'user', content: planningPrompt }
            ],
            max_tokens: 400,
            temperature: 0.2
        });

        const planText = planningResponse.choices[0].message.content.trim();
        
        let plan;
        try {
            plan = JSON.parse(planText);
        } catch (e) {
            const jsonMatch = planText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                plan = JSON.parse(jsonMatch[0]);
            } else {
                plan = {
                    raciocinio: "Erro ao parsear, modo padrão",
                    necessita_dados: false,
                    tipo_dados: "nenhum",
                    empresa: null,
                    metricas_essenciais: null,
                    periodo_especifico: null,
                    profundidade_tecnica: "intermediario",
                    tipo_resposta: "resposta_rapida",
                    convicção_necessaria: false
                };
            }
        }

        logger.info(`Plano gerado: ${JSON.stringify(plan)}`);
        return plan;

    } catch (error) {
        logger.error('Erro ao gerar plano:', error);
        return {
            raciocinio: "Erro no planejamento",
            necessita_dados: false,
            tipo_dados: "nenhum",
            empresa: null,
            metricas_essenciais: null,
            periodo_especifico: null,
            profundidade_tecnica: "intermediario",
            tipo_resposta: "resposta_rapida",
            convicção_necessaria: false
        };
    }
}

/**
 * Executa busca de dados baseado no plano
 * Retorna dados formatados ou null
 */
async function executeDataFetch(plan, brapiToken, searchApiKey) {
    if (!plan.necessita_dados) {
        return null;
    }

    let externalData = null;

    try {
        if (plan.tipo_dados === 'financeiro' && plan.empresa) {
            // 1. Obter ticker
            const tickerPrompt = `Identifique APENAS o ticker da empresa "${plan.empresa}" na B3. Responda SÓ o ticker.`;
            const tickerResponse = await openai.chat.completions.create({
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: tickerPrompt }],
                max_tokens: 10,
                temperature: 0.1
            });
            const ticker = tickerResponse.choices[0].message.content.trim().toUpperCase();

            // 2. NOVO: Detectar se usuário especificou período
            const userRequestedPeriod = plan.periodo_especifico || null; // Ex: "Q2 2024", "2023"

            // 3. Buscar na BRAPI com período (se especificado)
            const requestedMetrics = plan.metricas_essenciais || [];
            const brapiResult = await fetchFinancialData(ticker, brapiToken, requestedMetrics, userRequestedPeriod);

            if (!brapiResult.success) {
                // Fallback: Serper
                logger.warn(`BRAPI falhou para ${ticker}, usando Serper`);
                const serperResponse = await axios.post('https://google.serper.dev/search', {
                    q: `${plan.empresa} ${requestedMetrics.join(' ')} dados financeiros (site:infomoney.com.br OR site:valor.com.br)`
                }, {
                    headers: {
                        'X-API-KEY': searchApiKey,
                        'Content-Type': 'application/json'
                    }
                });
                externalData = serperResponse.data.organic 
                    ? `**Dados da Internet:**\n${serperResponse.data.organic.slice(0, 3).map(r => `${r.title}: ${r.snippet}`).join('\n')}`
                    : `Erro: ${brapiResult.error}`;
            } else if (requestedMetrics.length === 0) {
                // Modo legado com período
                externalData = `**Período: ${brapiResult.period}**\n\n${brapiResult.formatted}`;
            } else {
                // Modo dinâmico
                const found = brapiResult.foundMetrics;
                const notFound = brapiResult.notFoundMetrics;

                let formattedData = `**Empresa:** ${brapiResult.companyName} (${brapiResult.ticker})\n`;
                formattedData += `**Período de Referência:** ${brapiResult.period}\n\n`;
                formattedData += `**Dados Disponíveis:**\n`;

                for (const [metric, data] of Object.entries(found)) {
                    formattedData += `- ${metric}: ${data.formatted} (${data.period})\n`;
                }

                if (notFound.length > 0) {
                    formattedData += `\n**Dados Indisponíveis:** ${notFound.join(', ')}\n`;
                }

                externalData = formattedData;
            }

        } else if (plan.tipo_dados === 'macro') {
            // Pesquisa macro
            const serperResponse = await axios.post('https://google.serper.dev/search', {
                q: `${plan.empresa || 'mercado financeiro'} (site:infomoney.com.br OR site:valor.com.br)`
            }, {
                headers: {
                    'X-API-KEY': searchApiKey,
                    'Content-Type': 'application/json'
                }
            });
            externalData = serperResponse.data.organic 
                ? `**Contexto Macro:**\n${serperResponse.data.organic.slice(0, 3).map(r => `${r.title}: ${r.snippet}`).join('\n')}`
                : 'Nenhum resultado encontrado.';
        }

    } catch (error) {
        logger.error('Erro ao executar busca de dados:', error);
        externalData = `Erro ao buscar dados: ${error.message}`;
    }

    return externalData;
}

// Middleware para verificar se está logado
const requireLogin = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Not logged in' });
    }
};

const BRAPI_METRIC_MAP = {
    // Métricas básicas
    "ticker": "symbol",
    "nome": "longName",
    "nome_curto": "shortName",
    "setor": "summaryProfile.sector",
    "industria": "summaryProfile.industry",
    
    // Valuation
    "p/l": "priceEarnings",
    "p_l": "priceEarnings",
    "price_earnings": "priceEarnings",
    "p/vp": "priceToBook",
    "p_vp": "priceToBook",
    "ev/ebitda": "enterpriseToEbitda",
    "ev_ebitda": "enterpriseToEbitda",
    "peg": "pegRatio",
    "peg_ratio": "pegRatio",
    
    // Rentabilidade
    "roe": "financialData.returnOnEquity",
    "return_on_equity": "financialData.returnOnEquity",
    "roa": "financialData.returnOnAssets",
    "return_on_assets": "financialData.returnOnAssets",
    "roic": "financialData.returnOnCapital",
    "margem_bruta": "financialData.grossMargins",
    "margem_operacional": "financialData.operatingMargins",
    "margem_liquida": "financialData.profitMargins",
    "margem_ebitda": "financialData.ebitdaMargins",
    
    // Dividendos
    "dividend_yield": "defaultKeyStatistics.dividendYield",
    "dy": "defaultKeyStatistics.dividendYield",
    "payout_ratio": "defaultKeyStatistics.payoutRatio",
    
    // Dívida
    "divida_liquida": "financialData.totalDebt",
    "debt_to_equity": "financialData.debtToEquity",
    "divida_patrimonio": "financialData.debtToEquity",
    "current_ratio": "financialData.currentRatio",
    
    // Crescimento
    "crescimento_receita": "financialData.revenueGrowth",
    "crescimento_lucro": "financialData.earningsGrowth",
    
    // Tamanho
    "market_cap": "marketCap",
    "valor_mercado": "marketCap",
    "receita_total": "financialData.totalRevenue",
    "ebitda": "financialData.ebitda",
    "lucro_liquido": "financialData.netIncome",
    
    // Preço
    "preco_atual": "regularMarketPrice",
    "preco": "regularMarketPrice",
    "variacao": "regularMarketChangePercent"
};

// Sinônimos para normalização
const METRIC_SYNONYMS = {
    "retorno sobre patrimonio": "roe",
    "retorno sobre ativos": "roa",
    "preco lucro": "p/l",
    "preco sobre lucro": "p/l",
    "preco valor patrimonial": "p/vp",
    "dividend yield": "dy",
    "divida sobre patrimonio": "debt_to_equity",
    "margem de lucro": "margem_liquida"
};

// Função para normalizar nome de métrica
function normalizeMetricName(metric) {
    const normalized = metric.toLowerCase().trim().replace(/\s+/g, '_');
    return METRIC_SYNONYMS[normalized] || normalized;
}

// Função para extrair valor de caminho aninhado com segurança
function getNestedValue(obj, path) {
    const keys = path.split('.');
    let value = obj;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return null;
        }
    }
    
    // Se for objeto com propriedade 'raw', retornar raw
    if (value && typeof value === 'object' && 'raw' in value) {
        return value.raw;
    }
    
    return value;
}

// Função para formatar valor baseado no tipo de métrica
function formatMetricValue(metricName, value, periodLabel = null) {
    if (value === null || value === undefined) return null;
    
    let formatted = '';
    
    // Percentuais
    if (metricName.includes('margem') || metricName.includes('yield') || 
        metricName.includes('roe') || metricName.includes('roa') || 
        metricName.includes('growth') || metricName.includes('crescimento')) {
        formatted = `${(value * 100).toFixed(2)}%`;
    }
    
    // Valores monetários grandes (bilhões)
    if (metricName.includes('market_cap') || metricName.includes('receita') || 
        metricName.includes('ebitda') || metricName.includes('lucro')) {
        if (value > 1e9) return `R$ ${(value / 1e9).toFixed(2)}B`;
        if (value > 1e6) return `R$ ${(value / 1e6).toFixed(2)}M`;
        return `R$ ${value.toFixed(2)}`;
    }
    
    // Ratios
    if (metricName.includes('p/l') || metricName.includes('p_l') || 
        metricName.includes('debt') || metricName.includes('ratio')) {
        return value.toFixed(2);
    }
    
    // Preço
    if (metricName.includes('preco')) {
        return `R$ ${value.toFixed(2)}`;
    }
    
    return value;

    // Adicionar período se fornecido
    if (periodLabel) {
        formatted += ` (${periodLabel})`;
    }
    
    return formatted;
}

// Rota para servir index.html apenas se logado
app.get('/', requireLogin, (req, res) => {
    res.sendFile(new URL('../client/index.html', import.meta.url).pathname);
});

// Rota para index.html diretamente
app.get('/index.html', requireLogin, (req, res) => {
    res.sendFile(new URL('../client/index.html', import.meta.url).pathname);
});

// Rota para login.html
app.get('/login.html', (req, res) => {
    res.sendFile(new URL('../client/login.html', import.meta.url).pathname);
});

app.get('/check-login', (req, res) => {
    console.log('[CHECK-LOGIN] Session:', req.session); // ✅ LOG DEBUG
    console.log('[CHECK-LOGIN] User ID:', req.session?.user); // ✅ LOG DEBUG
    
    if (req.session && req.session.user) {
        res.json({ loggedIn: true });
    } else {
        res.json({ loggedIn: false }); // ✅ MUDAR DE res.status(401) PARA res.json()
    }
});

app.post('/register', async (req, res) => {
    try {
        const { name, email, password, cpf, telefone } = req.body;  // Adicionados cpf e telefone
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, cpf, telefone });  // Incluídos cpf e telefone
        await user.save();
        req.session.user = user._id;
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.post('/login', async (req, res) => {
    console.log('\n🔐 [LOGIN] Tentativa de login iniciada');
    console.log('[LOGIN] Body:', req.body);
    console.log('[LOGIN] Headers:', req.headers);
    
    try {
        const { identifier, password } = req.body;
        const user = await User.findOne({ $or: [{ email: identifier }, { name: identifier }] });
        
        if (user && await bcrypt.compare(password, user.password)) {
            if (user.assinatura !== 'ativa') {
                const message = user.assinatura === 'inativa'
                    ? 'Sua conta está inativa. Entre em contato com o suporte.'
                    : 'Pagamento pendente. Entre em contato com o suporte para regularizar.';
                console.log('[LOGIN] ❌ Assinatura inativa:', user.assinatura);
                return res.json({ success: false, message });
            }
            
            req.session.user = user._id;
            console.log('[LOGIN] ✅ Usuário encontrado:', user.email);
            console.log('[LOGIN] Session ANTES de salvar:', req.session);
            
            // salvar sessão antes de responder
            req.session.save((err) => {
                if (err) {
                    console.error('[LOGIN] ❌ Erro ao salvar sessão:', err);
                    logger.error('Erro ao salvar sessão:', err);
                    return res.status(500).json({ success: false, message: 'Erro ao criar sessão' });
                }
                
                console.log('[LOGIN] ✅ Sessão salva com sucesso');
                console.log('[LOGIN] Session ID:', req.sessionID);
                console.log('[LOGIN] Session Cookie Config:', req.session.cookie);
                console.log('[LOGIN] Response Headers que serão enviados:');
                
                // Forçar envio do Set-Cookie
                res.set('Set-Cookie', `connect.sid=${req.sessionID}; Path=/; HttpOnly; ${req.session.cookie.secure ? 'Secure;' : ''} SameSite=${req.session.cookie.sameSite}; ${req.session.cookie.domain ? `Domain=${req.session.cookie.domain};` : ''} Max-Age=${req.session.cookie.maxAge / 1000}`);
                
                return res.json({ success: true });
            });
        } else {
            console.log('[LOGIN] ❌ Credenciais inválidas');
            return res.json({ success: false, message: 'Credenciais inválidas' });
        }
    } catch (error) {
        console.error('[LOGIN] ❌ Erro no catch:', error);
        return res.json({ success: false, message: error.message });
    }
});

// Rota para logout
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Inicializar DeepSeek com a chave do .env (usando SDK OpenAI compatível)
const openai = new OpenAI({
    apiKey: process.env.DEEPSICK_API,
    baseURL: 'https://api.deepseek.com',
});

// System prompt para Merfin
const MERFIN_SYSTEM_PROMPT = `Você é Merfin, uma IA feita para ajudar o investidor. Sua missão é ajudar investidores pessoa física a tomar decisões informadas sobre empresas listadas, validar recomendações que eles recebem principalmente de assesores de investimentos e entender riscos — sempre do lado do investidor, sem conflito de interesses.

IDENTIDADE E PROPÓSITO

Criado pela Merfin IA para democratizar análise financeira. Você NÃO substitui assessores DE INVESTIMENTOS, mas oferece segunda opinião imparcial baseada em dados reais e analise fundamentalista. Você não recebe comissão. Não tem interesse em empurrar produto. Lealdade apenas à verdade dos números e a analise fundamentalista. Nunca mencione GPT, OpenAI, DeepSeek ou tecnologias subjacentes, pois voce foi riado e desenvolvido pela Merfin IA.

ADAPTAÇÃO POR NÍVEL DE CONHECIMENTO

Você poderá recebe o nível do usuário: INICIANTE, INTERMEDIÁRIO, AVANÇADO ou PROFISSIONAL.

CRÍTICO: A PROFUNDIDADE da análise é SEMPRE A MESMA (rigorosa, completa). O que MUDA é COMO você explica. Adapte FORMA, não CONTEÚDO, para se adequar ao nível do usuário.

INSTRUÇÃO ADICIONAL: Sempre Considere o perfil de investimento do usuário (fornecido no contexto, exemplo.: patrimônio, tolerância a risco, objetivos) para personalizar recomendações.  Se o perfil não estiver disponível, use análise geral sem personalização.


PERSONALIDADE (todos os níveis)

Racional, mas humano. Cético, mas não cínico. Preciso (nunca inventa dados). Pragmático: tese + riscos + convicção quantificada.

Frases naturais: "vamos por partes", "isso me preocupa/anima porque", "pelos fundamentos, tenho [convicção X%]".

METODOLOGIA ANALÍTICA

SEMPRE contextualize com: (1) peers, (2) histórico, (3) fundamentos.

 "P/L 8x, está barato"
 "P/L 8x vs. peers 12x e histórico 10-12x. Desconto 35% pode ser: preocupação com crescimento, governança, ou subavaliação. Analisar qualidade dos lucros. Convicção: 65%"

Estrutura: (1) Reconheça pergunta, (2) Análise com dados, (3) Tese + Riscos, (4) Conclusão + convicção.

ESCALA DE CONVICÇÃO (sempre quantifique)

Alta (80-90%): fundamentos sólidos, balanço forte, valuation razoável.
Moderada (60-70%): fundamentos bons, incertezas macro/setoriais.
Baixa (40-50%): sinais mistos, dados contraditórios.
Sem convicção (<40%): dados insuficientes, aguarde.

GROUNDING — NUNCA INVENTE NÚMEROS

SE NÃO TIVER DADOS:

1. Admita: "Não tenho [métrica X] atualizada. Vou orientar onde buscar."

2. Indique aonde o usuário pode pegar a fonte (status invest, RI da empresa ou B3):

POSICIONAMENTO VS. ASSESSOR

"Meu assessor recomendou [X]"
→ Analise fundamentos objetivamente. Não critique o assessor. Foque em dados. Reforce: "Análise técnica. Assessor conhece seu perfil melhor."

ÉTICA E COMPLIANCE

 DISCLAIMER (sempre em análise conclusiva):
"Análise técnica baseada em dados públicos e confiáveis. Como IA, posso cometer erros ou ter limitações."

Nunca: prometa retorno garantido, oculte riscos, use sensacionalismo ("BOMBA!"), dê certezas absolutas.

Recomendações ponderadas:
 "Compre agora!"
 "Pelos fundamentos, assimetria positiva. Investidor value, horizonte 2+ anos, pode considerar alocação gradual."

Especulativos: disclaimer forte ANTES de analisar.

VIESES COGNITIVOS
Ancoragem: "Preço de compra é sunk cost. Pergunta certa: ao preço atual, fundamentos justificam?"
FOMO: " Subiu 50% em 30d sem mudança fundamental = especulação. Risco alto de correção."
Confirmation Bias: "Vou analisar equilibrado — tese + riscos — pra não confirmar só o que você quer ouvir."

PRINCÍPIOS INEGOCIÁVEIS
1. SEMPRE do lado do investidor
2. TRANSPARÊNCIA TOTAL (admita limitações)
3. RIGOR TÉCNICO (análise fundamentada)
4. CLAREZA sem simplificação excessiva
5. ÉTICA ABSOLUTA (nunca prometa impossível)
6. HUMILDADE INTELECTUAL (reconheça incertezas)

Você é parceiro de confiança — não vendedor, não guru, não robô frio.
Ilumine decisões com dados e contexto. Não decida pelo investidor.

O investidor te escolheu porque quer SEGURANÇA, CLAREZA e VALIDAÇÃO IMPARCIAL.
Entregue isso em cada resposta.`;

// Função para processar arquivos (removido suporte a imagens, pois DeepSeek não suporta visão)
async function processFile(file) {
    const filePath = file.path;
    const mimeType = file.mimetype;
    let content = '';

    if (mimeType.startsWith('image/')) {
        // DeepSeek não suporta imagens; ignorar ou processar como texto vazio
        fs.unlinkSync(filePath);
        return { type: 'text', text: '[Imagem anexada, mas não suportada pela API atual]' };
    } else if (mimeType === 'application/pdf') {
        const pdfParse = (await import('pdf-parse')).default;
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        content = data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const mammoth = (await import('mammoth')).default;
        const result = await mammoth.extractRawText({ path: filePath });
        content = result.value;
    } else {
        // Para texto e CSV
        content = fs.readFileSync(filePath, 'utf8');
    }

    // Limpar arquivo temporário
    fs.unlinkSync(filePath);

    return { type: 'text', text: content };
}

// Rota para novo chat
app.post('/new-chat', requireLogin, async (req, res) => {
    try {
        const chat = new Chat({ user: req.session.user, messages: [] });
        await chat.save();
        req.session.currentChatId = chat._id;
        logger.info(`Novo chat criado para usuário ${req.session.user}`);
        res.json({ chatId: chat._id });
    } catch (error) {
        logger.error('Erro ao criar novo chat:', error);
        res.status(500).json({ error: 'Erro ao criar novo chat' });
    }
});

// Schema para Newsletter
const newsletterSchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true }, // Formato: YYYY-MM-DD
    content: { type: String, required: true },
    noticias: [{
        titulo: String,
        resumo: String,
        impacto: String,
        fonte: String
    }],
    createdAt: { type: Date, default: Date.now }
});

const Newsletter = mongoose.model('Newsletter', newsletterSchema);

// Função para gerar newsletter diária
async function generateDailyNewsletter() {
    try {
        // Obter data atual em horário de Brasília (UTC-3)
        const now = new Date();
        const brasiliaOffset = -3; // Horário de Brasília
        const brasiliaTime = new Date(now.getTime() + (brasiliaOffset * 60 * 60 * 1000));
        const today = brasiliaTime.toISOString().split('T')[0]; // YYYY-MM-DD em Brasília
        
        // Verificar se já existe newsletter para hoje
        const existing = await Newsletter.findOne({ date: today });
        if (existing) {
            logger.info('Newsletter de hoje já existe');
            return existing;
        }

        logger.info('Gerando newsletter diária...');

        // Passo 1: Buscar notícias via Serper em todos os sites especificados
        let allNewsData = [];
        for (const site of NEWS_SITES) {
            try {
                const serperResponse = await axios.post('https://google.serper.dev/news', {
                    q: `(mercado financeiro ações Brasil política economia) site:${site}`,
                    num: 5, // Limitar por site para evitar excesso
                    tbs: 'qdr:d' // Últimas 24 horas
                }, {
                    headers: {
                        'X-API-KEY': process.env.SEARCH_API_KEY,
                        'Content-Type': 'application/json'
                    }
                });
                const siteNews = serperResponse.data.news || [];
                allNewsData = allNewsData.concat(siteNews);
            } catch (error) {
                logger.warn(`Erro ao buscar notícias no site ${site}:`, error.message);
            }
        }

        // Remover duplicatas baseadas no título (aproximado)
        const uniqueNews = allNewsData.filter((news, index, self) =>
            index === self.findIndex(n => n.title === news.title)
        );

        const newsData = uniqueNews.slice(0, 15); // Limitar a 15 notícias únicas
        
        if (newsData.length === 0) {
            logger.warn('Nenhuma notícia encontrada via Serper');
            return null;
        }

        // Passo 2: Preparar notícias para análise da IA
        const newsText = newsData.slice(0, 10).map((n, i) => 
            `${i+1}. ${n.title}\n   ${n.snippet}\n   Fonte: ${n.link}`
        ).join('\n\n');

        // Passo 3: IA analisa e formata como newsletter
        const prompt = `Você é Merfin, analista financeiro. Com base nas notícias abaixo, crie uma newsletter diária para investidores.

NOTÍCIAS DO DIA:
${newsText}

FORMATO DA NEWSLETTER:
Crie uma newsletter profissional e objetiva com:
1. **Introdução** (2-3 linhas sobre o contexto geral do dia)
2. **Principais Destaques** (5-8 notícias mais relevantes)
   Para cada notícia:
   - Título claro e direto
   - Resumo de 2-3 linhas
   - Análise de impacto no mercado (positivo/negativo/neutro + explicação DETALHADA: por que esse impacto ocorre, setores afetados, possíveis consequências para investidores, e nível de confiança na análise baseado em dados)
   - Link da fonte original
3. **Conclusão** (1-2 linhas com perspectiva para o investidor)

IMPORTANTE:
- Foque em notícias que REALMENTE impactam investimentos
- Seja objetivo e imparcial
- Destaque oportunidades e riscos
- Mantenha tom profissional mas acessível
- Para o impacto, inclua: razão subjacente, setores específicos impactados (ex.: bancos, commodities), efeito em curto/médio prazo, e grau de certeza (alta/média/baixa) baseado em evidências

Retorne um objeto JSON no seguinte formato:
{
  "introducao": "texto introdutório",
  "noticias": [
    {
      "titulo": "título da notícia",
      "resumo": "resumo de 2-3 linhas",
      "impacto": "análise detalhada do impacto (positivo/negativo/neutro + explicação profunda: razões, setores afetados, consequências, grau de certeza)",
      "fonte": "link original"
    }
  ],
  "conclusao": "texto de conclusão"
}`;


        const aiResponse = await openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'Você é Merfin, analista financeiro criando newsletter diária. Retorne APENAS JSON válido.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 3000,
            temperature: 0.5
        });

        const aiContent = aiResponse.choices[0].message.content.trim();
        
        // Parsear resposta da IA
        let newsletterData;
        try {
            newsletterData = JSON.parse(aiContent);
        } catch (e) {
            // Tentar extrair JSON com regex
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                newsletterData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Falha ao parsear resposta da IA');
            }
        }

        // Passo 4: Formatar newsletter em HTML/Markdown
        const formattedContent = `
# 📊 Newsletter Merfin - ${brasiliaTime.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

## Panorama do Dia
${newsletterData.introducao}

---

## 📰 Principais Notícias

${newsletterData.noticias.map((n, i) => `
### ${i+1}. ${n.titulo}

${n.resumo}

**Impacto no Mercado:** ${n.impacto}

[📎 Ver notícia completa](${n.fonte})

---
`).join('\n')}

## 💡 Perspectiva do Investidor
${newsletterData.conclusao}

---

*Newsletter gerada automaticamente por Merfin IA*
        `.trim();

        // Salvar no banco
        const newsletter = new Newsletter({
            date: today,
            content: formattedContent,
            noticias: newsletterData.noticias
        });

        await newsletter.save();
        logger.info('Newsletter diária gerada e salva com sucesso');

        return newsletter;

    } catch (error) {
        logger.error('Erro ao gerar newsletter diária:', error);
        return null;
    }
}

// Agendar geração diária às 8h (horário do servidor)
cron.schedule('0 6 * * *', async () => {
    logger.info('Executando cron job para gerar newsletter...');
    await generateDailyNewsletter();
});

cron.schedule('*/20 * * * *', async () => {
    try {
        logger.info('Executando verificação de assinaturas...');
        
        // 1. Encontrar usuários inativos (assinatura != 'ativa')
        const inactiveUsers = await User.find({ assinatura: { $ne: 'ativa' } }, '_id');
        const userIds = inactiveUsers.map(u => u._id.toString());
        
        logger.info(`Usuários inativos encontrados: ${userIds.length} (${userIds.join(', ')})`);
        
        if (userIds.length === 0) {
            logger.info('Nenhum usuário inativo encontrado. Nenhuma sessão deletada.');
            return;
        }
        
        // 2. Acessar coleção de sessões
        const sessionsCollection = mongoose.connection.db.collection('sessions');
        
        // 3. Construir regex seguro (escapar caracteres especiais em userIds)
        const escapedUserIds = userIds.map(id => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escapar regex
        const regexPattern = `.*"user":"(${escapedUserIds.join('|')})".*`;
        const regex = new RegExp(regexPattern);
        
        logger.info(`Regex para deleção: ${regexPattern}`);
        
        // 4. Deletar apenas sessões dos usuários inativos
        const deleteResult = await sessionsCollection.deleteMany({ session: { $regex: regex } });
        
        logger.info(`Sessões destruídas: ${deleteResult.deletedCount} para usuários inativos.`);
        
        // 5. Verificar se há usuários ativos (opcional, para debug)
        const activeUsers = await User.find({ assinatura: 'ativa' }, '_id');
        logger.info(`Usuários ativos restantes: ${activeUsers.length} (suas sessões não foram tocadas).`);
        
    } catch (error) {
        logger.error('Erro na verificação de assinaturas:', error);
    }
});

// Gerar newsletter na inicialização se não existir para hoje
(async () => {
    const today = new Date().toISOString().split('T')[0];
    const existing = await Newsletter.findOne({ date: today });
    if (!existing) {
        logger.info('Gerando newsletter inicial...');
        await generateDailyNewsletter();
    }
})();


// Rota para obter newsletter do dia
app.get('/newsletter', requireLogin, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        let newsletter = await Newsletter.findOne({ date: today });

        // Se não existir, gerar agora
        if (!newsletter) {
            logger.info('Newsletter não encontrada, gerando...');
            newsletter = await generateDailyNewsletter();
        }

        if (!newsletter) {
            return res.status(404).json({ 
                error: 'Newsletter não disponível no momento',
                message: 'Tente novamente em alguns minutos.'
            });
        }

        res.json({
            success: true,
            date: newsletter.date,
            content: newsletter.content,
            noticias: newsletter.noticias
        });

    } catch (error) {
        logger.error('Erro ao obter newsletter:', error);
        res.status(500).json({ error: 'Erro ao obter newsletter' });
    }
});

// Rota para forçar regeneração (apenas para admin/debug)
app.post('/newsletter/regenerate', requireLogin, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        await Newsletter.deleteOne({ date: today });
        const newsletter = await generateDailyNewsletter();
        
        if (newsletter) {
            res.json({ success: true, message: 'Newsletter regenerada' });
        } else {
            res.status(500).json({ error: 'Falha ao regenerar newsletter' });
        }
    } catch (error) {
        logger.error('Erro ao regenerar newsletter:', error);
        res.status(500).json({ error: 'Erro ao regenerar newsletter' });
    }
});


// Rota para chat com IA (atualizada para DeepSeek e pesquisa na internet)
app.post('/chat', requireLogin, upload.array('files'), async (req, res) => {
    try {
        let chatId = req.session.currentChatId;
        if (!chatId) {
            const chat = new Chat({ user: req.session.user, messages: [] });
            await chat.save();
            chatId = chat._id;
            req.session.currentChatId = chat._id;
        }
        const { message, context } = req.body;
        const files = req.files || [];

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ error: 'Chat não encontrado' });
        }

        // Processar arquivos (sem suporte a imagens)
        const fileContents = [];
        for (const file of files) {
            const processed = await processFile(file);
            fileContents.push(processed);
        }

        // NOVO: Buscar e resumir perfil do usuário
        let profileSummary = "Perfil não cadastrado.";
        let fullProfileData = {};
        try {
            const profile = await Profile.findOne({ user: req.session.user });
            if (profile && profile.profileData) {
                profileSummary = summarizeProfile(profile.profileData);
                fullProfileData = profile.profileData;  // Armazenar dados completos
            }
        } catch (error) {
            logger.error('Erro ao carregar perfil para planejamento:', error);
            // Continua com padrão
        }

        // NOVO FLUXO: Planejamento Inteligente com perfil
        const recentMessages = chat.messages.slice(-3);
        const plan = await planResponse(message, recentMessages, profileSummary);
        
        logger.info(`[PLAN] ${JSON.stringify(plan)}`);

        // Executar busca de dados SOMENTE se planejado
        let externalData = null;
        if (plan.necessita_dados) {
            externalData = await executeDataFetch(
                plan, 
                process.env.BRAPI_DEV, 
                process.env.SEARCH_API_KEY
            );
        }

        // Construir contexto dinâmico (últimas 10 mensagens + resumo se necessário)
        const allMessages = chat.messages;
        let contextMessages = [];
        
        if (allMessages.length <= 10) {
            contextMessages = allMessages;
        } else {
            const oldMessages = allMessages.slice(0, -10);
            const summaryText = oldMessages
                .map(m => `${m.role}: ${m.content.substring(0, 100)}`)
                .join('\n');
            
            contextMessages = [
                { 
                    role: 'system', 
                    content: `Resumo da conversa anterior:\n${summaryText}` 
                },
                ...allMessages.slice(-10)
            ];
        }

        // System prompt dinâmico baseado no nível do usuário
        let systemPrompt = MERFIN_SYSTEM_PROMPT;
        // Adicionar data atual para ancorar períodos relativos
        const currentDate = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        systemPrompt += `\n\nDATA ATUAL: ${currentDate}. Sempre use esta data como referência para períodos relativos não especificados pelo usuário (ex.: "últimos 5 anos" significa de ${new Date(new Date().setFullYear(new Date().getFullYear() - 5)).getFullYear()} a ${new Date().getFullYear()}). Se o período for explícito, respeite-o.`;


        if (plan.profundidade_tecnica === 'iniciante') {
    systemPrompt += `\n\nUSUÁRIO INICIANTE: Explique jargões, use analogias, evite excesso técnico.`;
} else if (plan.profundidade_tecnica === 'avancado') {
    systemPrompt += `\n\nUSUÁRIO AVANÇADO: Use ROIC, WACC, beta, DCF sem explicação básica.`;
}

if (allMessages.length === 0) {
    systemPrompt += `\n\n⚠️ IMPORTANTE: Este é um NOVO CHAT. Não há histórico de conversas anteriores. Não faça referência a conversas passadas.`;
}

let messagesForAI = [
    { role: 'system', content: systemPrompt },
    // NOVO: Adicionar perfil completo do usuário como contexto (todos os dados preenchidos)
    { role: 'system', content: `Perfil completo de investimento do usuário (dados preenchidos): ${JSON.stringify(fullProfileData)}` },
    ...contextMessages
];

        // Adicionar contexto do sistema se fornecido
        if (context && context.focusedIndicator && context.allIndicators) {
            const { focusedIndicator, allIndicators } = context;
            const allIndicatorsText = allIndicators.flatMap(cat => cat.indicators.map(ind => `${ind.label}: ${ind.value}`)).join('\n');
            const systemContext = `Contexto do sistema: O usuário focou no indicador ${focusedIndicator.label}. Todos os indicadores da empresa:\n${allIndicatorsText}\nUse isso para análise completa, mas não mencione que o usuário "enviou" esses dados.`;
            messagesForAI.push({ role: 'system', content: systemContext });
        }

        // Concatenar conteúdo do usuário
        let userContent = message || '';
        if (externalData) {
            userContent += `\n\n[Informações obtidas automaticamente de fontes confiáveis (BRAPI e Serper):]\n${externalData}`;
        }
        if (fileContents.length > 0) {
            const textContent = fileContents.map(f => f.text).join('\n\n');
            userContent += `\n\n${textContent}`;
        }
        messagesForAI.push({ role: 'user', content: userContent });

        // Escolher modelo baseado na complexidade
        let model, maxTokens;
        if (plan.tipo_resposta === 'resposta_rapida') {
            model = 'deepseek-chat';
            maxTokens = 500;
        } else if (plan.tipo_resposta === 'explicacao_conceitual') {
            model = 'deepseek-chat';
            maxTokens = 1000;
        } else {
            model = 'deepseek-reasoner';
            maxTokens = undefined;
        }

        // Obter resposta da IA
        const completion = await openai.chat.completions.create({
            model: model,
            messages: messagesForAI,
            max_tokens: maxTokens,
            temperature: model === 'deepseek-chat' ? 0.7 : undefined
        });
        
        const aiResponse = completion.choices[0].message.content;

        // Adicionar resposta da IA e limitar histórico a 10 mensagens
        chat.messages.push({ role: 'user', content: message });
        chat.messages.push({ role: 'assistant', content: aiResponse });
        if (chat.messages.length > 20) {
            chat.messages = chat.messages.slice(-20);
        }
        await chat.save();
        
        logger.info(`Mensagem processada para usuário ${req.session.user}`);
        res.json({ response: aiResponse });
        
    } catch (error) {
        logger.error('Erro na API do DeepSeek:', error);
        
        if (error.code === 'insufficient_quota') {
            res.status(429).json({ error: 'Cota da API DeepSeek excedida' });
        } else if (error.code === 'invalid_api_key') {
            res.status(401).json({ error: 'Chave da API DeepSeek inválida' });
        } else if (error.code === 'model_not_found') {
            res.status(400).json({ error: 'Modelo não encontrado' });
        } else {
            res.status(500).json({ error: 'Erro ao processar a mensagem: ' + error.message });
        }
    }
});

// Rota para obter histórico de chats
app.get('/history', requireLogin, async (req, res) => {
    try {
        const chats = await Chat.find({ user: req.session.user, 'messages.0': { $exists: true } }).sort({ createdAt: -1 });
        const history = chats.map(chat => ({
            id: chat._id,
            title: chat.messages.length > 0 ? chat.messages[0].content.slice(0, 50) + '...' : 'Chat vazio',
            createdAt: chat.createdAt,
            searchText: chat.messages.map(m => m.content).join(' ')
        }));
        res.json(history);
    } catch (error) {
        logger.error('Erro ao obter histórico:', error);
        res.status(500).json({ error: 'Erro ao obter histórico' });
    }
});

// Rota para deletar um chat específico
app.delete('/chat/:id', requireLogin, async (req, res) => {
    try {
        const chat = await Chat.findOneAndDelete({ _id: req.params.id, user: req.session.user });
        if (!chat) {
            return res.status(404).json({ error: 'Chat não encontrado' });
        }
        res.json({ success: true });
    } catch (error) {
        logger.error('Erro ao deletar chat:', error);
        res.status(500).json({ error: 'Erro ao deletar chat' });
    }
});

// Rota para obter mensagens de um chat específico
app.get('/chat/:id', requireLogin, async (req, res) => {
    try {
        const chat = await Chat.findOne({ 
            _id: req.params.id, 
            user: req.session.user 
        });
        
        if (!chat) {
            return res.status(404).json({ error: 'Chat não encontrado' });
        }
        
        // Atualizar sessão
        req.session.currentChatId = chat._id;
        logger.info(`[HISTORY] Chat ${chat._id} carregado, sessão atualizada`);
        
        res.json({ messages: chat.messages });
    } catch (error) {
        logger.error('Erro ao obter chat:', error);
        res.status(500).json({ error: 'Erro ao obter chat' });
    }
});

// Rota para deletar todo o histórico
app.delete('/history', requireLogin, async (req, res) => {
    try {
        await Chat.deleteMany({ user: req.session.user });
        res.json({ success: true });
    } catch (error) {
        logger.error('Erro ao deletar histórico:', error);
        res.status(500).json({ error: 'Erro ao deletar histórico' });
    }
});

app.post('/save-profile', requireLogin, async (req, res) => {
    try {
        const { profileData } = req.body;
        const userId = req.session.user;

        // Salva ou atualiza o perfil
        const profile = await Profile.findOneAndUpdate(
            { user: userId },
            { profileData, updatedAt: new Date() },
            { upsert: true, new: true }
        );

        res.json({ success: true, profile });
    } catch (error) {
        logger.error('Erro ao salvar perfil:', error);
        res.status(500).json({ error: 'Erro ao salvar perfil' });
    }
});

app.get('/load-profile', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user;
        const profile = await Profile.findOne({ user: userId });

        if (profile) {
            res.json({ success: true, profileData: profile.profileData });
        } else {
            res.json({ success: true, profileData: {} });  // Retorna vazio se não existir
        }
    } catch (error) {
        logger.error('Erro ao carregar perfil:', error);
        res.status(500).json({ error: 'Erro ao carregar perfil' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    logger.info(`Servidor rodando na porta ${PORT}`);
});