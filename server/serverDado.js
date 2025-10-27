import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

function categorizeIndicators(indicators) {
    const categories = {
        "Rentabilidade": {
            description: "Indicadores que avaliam o retorno sobre investimentos e eficiência de lucros.",
            indicators: []
        },
        "Liquidez": {
            description: "Indicadores de capacidade de pagamento e saúde financeira imediata.",
            indicators: []
        },
        "Endividamento": {
            description: "Relações entre dívida e patrimônio, indicando risco financeiro.",
            indicators: []
        },
        "Valuation": {
            description: "Métricas de avaliação de preço e valor intrínseco.",
            indicators: []
        },
        "Crescimento": {
            description: "Indicadores de evolução de receitas e expansão da empresa.",
            indicators: []
        },
        "Eficiência Operacional": {
            description: "Indicadores de gestão de custos e ativos operacionais.",
            indicators: []
        },
        "Estrutura de Capital": {
            description: "Composição financeira e distribuição de capital.",
            indicators: []
        },
        "Outros": {
            description: "Indicadores complementares e gerais.",
            indicators: []
        }
    };

    const mapping = {
        "ROE": "Rentabilidade", "Profit Margins": "Rentabilidade", "Net Profit Margin": "Rentabilidade", "Return on Assets": "Rentabilidade",
        "Quick Ratio": "Liquidez", "Current Ratio": "Liquidez", "Total Cash": "Liquidez", "Cash Flow Margin": "Liquidez", "Cash": "Liquidez",
        "Debt to Equity": "Endividamento", "Debt to Assets": "Endividamento", "Net Debt": "Endividamento", "Total Debt": "Endividamento",
        "P/L": "Valuation", "Price to Book": "Valuation", "Enterprise to EBITDA": "Valuation", "Price to Sales (P/S)": "Valuation", "Price to Cash Flow": "Valuation", "EV to Sales": "Valuation",
        "Revenue Growth": "Crescimento", "EBITDA to Sales": "Crescimento",
        "Inventory Turnover": "Eficiência Operacional", "Operating Margins": "Eficiência Operacional", "Gross Margins": "Eficiência Operacional",
        "Total Assets": "Estrutura de Capital", "Equity (Patrimônio Líquido)": "Estrutura de Capital", "Shares Outstanding": "Estrutura de Capital", "Total Liabilities": "Estrutura de Capital",
        "Market Cap": "Outros", "Dividend Yield": "Outros", "EBITDA": "Outros", "Total Revenue": "Outros", "Net Income": "Outros", "Free Cash Flow": "Outros", "Operating Cash Flow": "Outros", "Trailing EPS": "Outros", "Forward P/E": "Outros", "PEG Ratio": "Outros", "Enterprise to Revenue": "Outros", "Target Mean Price": "Outros", "Inventory": "Outros", "Gross Profit": "Outros", "Net Income to Common": "Outros", "Book Value": "Outros", "Enterprise Value": "Outros"
    };

    const labelTranslations = {
        "Market Cap": "Valor de Mercado",
        "P/L": "Preço/Lucro",
        "ROE": "Retorno sobre o Patrimônio Líquido",
        "Dividend Yield": "Rendimento de Dividendos",
        "EBITDA": "EBITDA",
        "Debt to Equity": "Dívida/Patrimônio",
        "Quick Ratio": "Liquidez Imediata",
        "Current Ratio": "Liquidez Corrente",
        "Return on Assets": "Retorno sobre Ativos",
        "Profit Margins": "Margem de Lucro",
        "Enterprise Value": "Valor da Firma",
        "Price to Book": "Preço/Valor Patrimonial",
        "Book Value": "Valor Patrimonial",
        "Total Revenue": "Receita Total",
        "Gross Margins": "Margem Bruta",
        "Operating Margins": "Margem Operacional",
        "Net Income": "Lucro Líquido",
        "Total Cash": "Caixa Total",
        "Total Debt": "Dívida Total",
        "Free Cash Flow": "Fluxo de Caixa Livre",
        "Operating Cash Flow": "Fluxo de Caixa Operacional",
        "Total Assets": "Ativos Totais",
        "Total Liabilities": "Passivos Totais",
        "Shares Outstanding": "Ações em Circulação",
        "Trailing EPS": "Lucro por Ação (Trailing)",
        "Net Income to Common": "Lucro Líquido para Acionistas Comuns",
        "Forward P/E": "P/L Projetado",
        "PEG Ratio": "Razão PEG",
        "Enterprise to Revenue": "EV/Receita",
        "Enterprise to EBITDA": "EV/EBITDA",
        "Target Mean Price": "Preço-Alvo Médio",
        "Revenue Growth": "Crescimento da Receita",
        "Cash": "Caixa",
        "Inventory": "Estoque",
        "Gross Profit": "Lucro Bruto",
        "Price to Sales (P/S)": "Preço/Vendas",
        "Net Debt": "Dívida Líquida",
        "Debt to Assets": "Dívida/Ativos",
        "Equity (Patrimônio Líquido)": "Patrimônio Líquido",
        "Price to Cash Flow": "Preço/Fluxo de Caixa",
        "EV to Sales": "EV/Vendas",
        "Net Profit Margin": "Margem Líquida",
        "Cash Flow Margin": "Margem de Fluxo de Caixa",
        "Inventory Turnover": "Rotatividade de Estoque",
        "EBITDA to Sales": "EBITDA/Vendas"
    };

    indicators.forEach(ind => {
        const category = mapping[ind.label] || "Outros";
        categories[category].indicators.push({
            ...ind,
            label_pt: labelTranslations[ind.label] || ind.label
        });
    });

    return Object.entries(categories)
        .filter(([_, cat]) => cat.indicators.length > 0)
        .map(([name, cat]) => ({ name, description: cat.description, indicators: cat.indicators }));
}

app.get('/api/company-indicators-by-name', async (req, res) => {
    const { name } = req.query;
    const deepseekToken = process.env.DEEPSICK_API;
    if (!deepseekToken) {
        return res.status(500).json({ error: 'Chave DEEPSICK_API não configurada' });
    }
    
    try {
        const aiResponse = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: 'deepseek-chat',
            messages: [
                { role: 'user', content: `What is the stock ticker for ${name} on the Brazilian stock exchange B3? Respond with only the ticker, no explanation.` }
            ],
            max_tokens: 10
        }, {
            headers: {
                'Authorization': `Bearer ${deepseekToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const ticker = aiResponse.data.choices[0].message.content.trim().toUpperCase();
        
        const brapiToken = process.env.BRAPI_DEV;
        if (!brapiToken) {
            return res.status(500).json({ error: 'Chave BRAPI não configurada' });
        }
        
        const fetchData = async (retry = false) => {
            try {
                // MUDANÇA: Adicionar todos os parâmetros em uma única requisição
                const response = await axios.get(`https://brapi.dev/api/quote/${ticker}?range=5d&interval=1d&fundamental=true&dividends=true&modules=summaryProfile,defaultKeyStatistics,financialData,balanceSheetHistoryQuarterly,incomeStatementHistoryQuarterly&token=${brapiToken}`);
                const data = response.data;
                if (data.results && data.results[0]) {
                    const result = data.results[0];
                    const stats = result.defaultKeyStatistics || {};
                    const finData = result.financialData || {};
                    
                    const indicators = [
                        { label: 'Market Cap', value: result.marketCap ? `R$ ${(result.marketCap / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'P/L', value: result.priceEarnings ? result.priceEarnings.toFixed(2) : 'N/A' },
                        { label: 'ROE', value: finData.returnOnEquity ? `${(finData.returnOnEquity * 100).toFixed(2)}%` : 'N/A' },
                        { label: 'Dividend Yield', value: stats.dividendYield ? `${(stats.dividendYield * 100).toFixed(2)}%` : 'N/A' },
                        { label: 'EBITDA', value: finData.ebitda ? `R$ ${(finData.ebitda / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Debt to Equity', value: finData.debtToEquity ? finData.debtToEquity.toFixed(2) : 'N/A' },
                        { label: 'Quick Ratio', value: finData.quickRatio ? finData.quickRatio.toFixed(2) : 'N/A' },
                        { label: 'Current Ratio', value: finData.currentRatio ? finData.currentRatio.toFixed(2) : 'N/A' },
                        { label: 'Return on Assets', value: finData.returnOnAssets ? `${(finData.returnOnAssets * 100).toFixed(2)}%` : 'N/A' },
                        { label: 'Profit Margins', value: finData.profitMargins ? `${(finData.profitMargins * 100).toFixed(2)}%` : 'N/A' },
                        { label: 'Enterprise Value', value: stats.enterpriseValue ? `R$ ${(stats.enterpriseValue / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Price to Book', value: stats.priceToBook ? stats.priceToBook.toFixed(2) : 'N/A' },
                        { label: 'Book Value', value: stats.bookValue ? `R$ ${stats.bookValue.toFixed(2)}` : 'N/A' },
                        { label: 'Total Revenue', value: finData.totalRevenue ? `R$ ${(finData.totalRevenue / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Gross Margins', value: finData.grossMargins ? `${(finData.grossMargins * 100).toFixed(2)}%` : 'N/A' },
                        { label: 'Operating Margins', value: finData.operatingMargins ? `${(finData.operatingMargins * 100).toFixed(2)}%` : 'N/A' },
                        { label: 'Net Income', value: (result.incomeStatementHistoryQuarterly && result.incomeStatementHistoryQuarterly[0] && result.incomeStatementHistoryQuarterly[0].netIncome) ? `R$ ${(result.incomeStatementHistoryQuarterly[0].netIncome / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Total Cash', value: finData.totalCash ? `R$ ${(finData.totalCash / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Total Debt', value: finData.totalDebt ? `R$ ${(finData.totalDebt / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Free Cash Flow', value: finData.freeCashflow ? `R$ ${(finData.freeCashflow / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Operating Cash Flow', value: finData.operatingCashflow ? `R$ ${(finData.operatingCashflow / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Total Assets', value: (result.balanceSheetHistoryQuarterly && result.balanceSheetHistoryQuarterly[0] && result.balanceSheetHistoryQuarterly[0].totalAssets) ? `R$ ${(result.balanceSheetHistoryQuarterly[0].totalAssets / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Total Liabilities', value: (result.balanceSheetHistoryQuarterly && result.balanceSheetHistoryQuarterly[0] && result.balanceSheetHistoryQuarterly[0].totalLiab) ? `R$ ${(result.balanceSheetHistoryQuarterly[0].totalLiab / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Shares Outstanding', value: stats.sharesOutstanding ? stats.sharesOutstanding.toLocaleString() : 'N/A' },
                        { label: 'Trailing EPS', value: stats.trailingEps ? `R$ ${stats.trailingEps.toFixed(2)}` : 'N/A' },
                        { label: 'Net Income to Common', value: stats.netIncomeToCommon ? `R$ ${(stats.netIncomeToCommon / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Forward P/E', value: stats.forwardPE ? stats.forwardPE.toFixed(2) : 'N/A' },
                        { label: 'PEG Ratio', value: stats.pegRatio ? stats.pegRatio.toFixed(2) : 'N/A' },
                        { label: 'Enterprise to Revenue', value: stats.enterpriseToRevenue ? stats.enterpriseToRevenue.toFixed(2) : 'N/A' },
                        { label: 'Enterprise to EBITDA', value: stats.enterpriseToEbitda ? stats.enterpriseToEbitda.toFixed(2) : 'N/A' },
                        { label: 'Target Mean Price', value: finData.targetMeanPrice ? `R$ ${finData.targetMeanPrice.toFixed(2)}` : 'N/A' },
                        { label: 'Revenue Growth', value: finData.revenueGrowth ? `${(finData.revenueGrowth * 100).toFixed(2)}%` : 'N/A' },
                        { label: 'Cash', value: (result.balanceSheetHistoryQuarterly && result.balanceSheetHistoryQuarterly[0] && result.balanceSheetHistoryQuarterly[0].cash) ? `R$ ${(result.balanceSheetHistoryQuarterly[0].cash / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Inventory', value: (result.balanceSheetHistoryQuarterly && result.balanceSheetHistoryQuarterly[0] && result.balanceSheetHistoryQuarterly[0].inventory) ? `R$ ${(result.balanceSheetHistoryQuarterly[0].inventory / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Gross Profit', value: (result.incomeStatementHistoryQuarterly && result.incomeStatementHistoryQuarterly[0] && result.incomeStatementHistoryQuarterly[0].grossProfit) ? `R$ ${(result.incomeStatementHistoryQuarterly[0].grossProfit / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Price to Sales (P/S)', value: (result.marketCap && finData.totalRevenue) ? (result.marketCap / finData.totalRevenue).toFixed(2) : 'N/A' },
                        { label: 'Net Debt', value: (finData.totalDebt && finData.totalCash) ? `R$ ${((finData.totalDebt - finData.totalCash) / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Debt to Assets', value: ((result.balanceSheetHistoryQuarterly && result.balanceSheetHistoryQuarterly[0] && result.balanceSheetHistoryQuarterly[0].totalLiab) && (result.balanceSheetHistoryQuarterly[0].totalAssets)) ? `${((result.balanceSheetHistoryQuarterly[0].totalLiab / result.balanceSheetHistoryQuarterly[0].totalAssets) * 100).toFixed(2)}%` : 'N/A' },
                        { label: 'Equity (Patrimônio Líquido)', value: ((result.balanceSheetHistoryQuarterly && result.balanceSheetHistoryQuarterly[0] && result.balanceSheetHistoryQuarterly[0].totalAssets) && result.balanceSheetHistoryQuarterly[0].totalLiab) ? `R$ ${((result.balanceSheetHistoryQuarterly[0].totalAssets - result.balanceSheetHistoryQuarterly[0].totalLiab) / 1e9).toFixed(2)}B` : 'N/A' },
                        { label: 'Price to Cash Flow', value: (result.marketCap && finData.operatingCashflow) ? (result.marketCap / finData.operatingCashflow).toFixed(2) : 'N/A' },
                        { label: 'EV to Sales', value: (stats.enterpriseValue && finData.totalRevenue) ? (stats.enterpriseValue / finData.totalRevenue).toFixed(2) : 'N/A' },
                        { label: 'Net Profit Margin', value: ((result.incomeStatementHistoryQuarterly && result.incomeStatementHistoryQuarterly[0] && result.incomeStatementHistoryQuarterly[0].netIncome) && finData.totalRevenue) ? `${((result.incomeStatementHistoryQuarterly[0].netIncome / finData.totalRevenue) * 100).toFixed(2)}%` : 'N/A' },
                        { label: 'Cash Flow Margin', value: (finData.operatingCashflow && finData.totalRevenue) ? `${((finData.operatingCashflow / finData.totalRevenue) * 100).toFixed(2)}%` : 'N/A' },
                        { label: 'Inventory Turnover', value: (finData.totalRevenue && (result.balanceSheetHistoryQuarterly && result.balanceSheetHistoryQuarterly[0] && result.balanceSheetHistoryQuarterly[0].inventory)) ? (finData.totalRevenue / result.balanceSheetHistoryQuarterly[0].inventory).toFixed(2) : 'N/A' },
                        { label: 'EBITDA to Sales', value: (finData.ebitda && finData.totalRevenue) ? `${((finData.ebitda / finData.totalRevenue) * 100).toFixed(2)}%` : 'N/A' }
                    ];
                    
                    const naCount = indicators.filter(ind => ind.value === 'N/A').length;
                    
                    if (naCount > indicators.length / 2 && !retry) {
                        console.log(`Muitos N/A para ${ticker}, tentando novamente...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        return await fetchData(true);
                    }
                    
                    res.json({
                        ticker,
                        name: result.longName || result.shortName || ticker,
                        variation: result.regularMarketChangePercent || 0,
                        indicators
                    });
                } else {
                    res.status(404).json({ error: 'Ticker não encontrado' });
                }
            } catch (error) {
                console.error('Erro na BRAPI:', error);
                res.status(500).json({ error: 'Erro ao buscar dados' });
            }
        };
        
        await fetchData();
    } catch (error) {
        console.error('Erro na DeepSeek ou BRAPI:', error);
        res.status(500).json({ error: 'Erro ao buscar ticker ou indicadores' });
    }
});

app.get('/api/company-indicators/:ticker', async (req, res) => {
    const { ticker } = req.params;
    const token = process.env.BRAPI_DEV;
    if (!token) {
        return res.status(500).json({ error: 'Chave BRAPI não configurada' });
    }
    
    const fetchData = async (retry = false) => {
        try {
            // MUDANÇA: Adicionar todos os parâmetros em uma única requisição
            const response = await axios.get(`https://brapi.dev/api/quote/${ticker}?range=5d&interval=1d&fundamental=true&dividends=true&modules=summaryProfile,defaultKeyStatistics,financialData,balanceSheetHistoryQuarterly,incomeStatementHistoryQuarterly&token=${token}`);
            const data = response.data;
            if (data.results && data.results[0]) {
                const result = data.results[0];
                const stats = result.defaultKeyStatistics || {};
                const finData = result.financialData || {};
                
                // MUDANÇA: Função melhorada para calcular trimestre dinamicamente
                const getQuarterlyHistory = (historyArray, key, years = 5) => {
                    if (!historyArray || historyArray.length === 0) return [];
                    
                    const currentDate = new Date();
                    const currentMonth = currentDate.getMonth(); // 0-11
                    const currentYear = currentDate.getFullYear();
                    
                    // Calcular qual trimestre usar (regra: só conta trimestre se passaram 2+ meses)
                    let targetQuarter, targetYear;
                    const monthInQuarter = currentMonth % 3;
                    
                    if (monthInQuarter < 2) {
                        // Menos de 2 meses no trimestre atual, usar trimestre anterior
                        const previousQuarter = Math.floor(currentMonth / 3);
                        if (previousQuarter === 0) {
                            targetQuarter = 4;
                            targetYear = currentYear - 1;
                        } else {
                            targetQuarter = previousQuarter;
                            targetYear = currentYear;
                        }
                    } else {
                        // 2+ meses no trimestre, usar trimestre atual
                        targetQuarter = Math.floor(currentMonth / 3) + 1;
                        targetYear = currentYear;
                    }
                    
                    const history = [];
                    for (let i = 0; i < years; i++) {
                        const year = targetYear - i;
                        const quarterData = historyArray.find(h => {
                            if (!h.endDate) return false;
                            const hDate = new Date(h.endDate);
                            const hQuarter = Math.floor((hDate.getMonth() + 3) / 3);
                            return hDate.getFullYear() === year && hQuarter === targetQuarter;
                        });
                        
                        if (quarterData && quarterData[key] !== undefined && quarterData[key] !== null) {
                            history.push({ 
                                year: `${year} Q${targetQuarter}`, 
                                value: quarterData[key] 
                            });
                        }
                    }
                    return history.reverse();
                };
                
                const indicators = [
                    { 
                        label: 'Market Cap', 
                        value: result.marketCap ? `R$ ${(result.marketCap / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Valor total de mercado da empresa.',
                        history: []
                    },
                    { 
                        label: 'P/L', 
                        value: result.priceEarnings ? result.priceEarnings.toFixed(2) : 'N/A',
                        description: 'Preço da ação dividido pelo lucro por ação.',
                        history: getQuarterlyHistory(result.incomeStatementHistoryQuarterly, 'netIncome', 5).map(h => ({
                            year: h.year,
                            value: result.balanceSheetHistoryQuarterly ? 
                                (result.balanceSheetHistoryQuarterly.find(b => b.endDate.includes(h.year.split(' ')[0]))?.totalStockholderEquity ? 
                                    (h.value / result.balanceSheetHistoryQuarterly.find(b => b.endDate.includes(h.year.split(' ')[0])).totalStockholderEquity * 100).toFixed(2) + '%' : 'N/A') : 'N/A'
                        }))
                    },
                    { 
                        label: 'ROE', 
                        value: finData.returnOnEquity ? `${(finData.returnOnEquity * 100).toFixed(2)}%` : 'N/A',
                        description: 'Retorno sobre o patrimônio líquido.',
                        history: getQuarterlyHistory(result.incomeStatementHistoryQuarterly, 'netIncome', 5).map(h => {
                            const balanceData = result.balanceSheetHistoryQuarterly?.find(b => b.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: balanceData?.totalStockholderEquity ? 
                                    `${((h.value / balanceData.totalStockholderEquity) * 100).toFixed(2)}%` : 'N/A'
                            };
                        })
                    },
                    { 
                        label: 'Dividend Yield', 
                        value: stats.dividendYield ? `${(stats.dividendYield * 100).toFixed(2)}%` : 'N/A',
                        description: 'Rendimento de dividendos em relação ao preço da ação.',
                        history: []
                    },
                    { 
                        label: 'EBITDA', 
                        value: finData.ebitda ? `R$ ${(finData.ebitda / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Lucro antes de juros, impostos, depreciação e amortização.',
                        history: getQuarterlyHistory(result.incomeStatementHistoryQuarterly, 'ebitda', 5).map(h => ({
                            year: h.year,
                            value: `R$ ${(h.value / 1e9).toFixed(2)}B`
                        }))
                    },
                    { 
                        label: 'Debt to Equity', 
                        value: finData.debtToEquity ? finData.debtToEquity.toFixed(2) : 'N/A',
                        description: 'Relação entre dívida e patrimônio líquido.',
                        history: getQuarterlyHistory(result.balanceSheetHistoryQuarterly, 'totalLiab', 5).map(h => {
                            const balanceData = result.balanceSheetHistoryQuarterly?.find(b => b.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: balanceData?.totalStockholderEquity ? 
                                    (h.value / balanceData.totalStockholderEquity).toFixed(2) : 'N/A'
                            };
                        })
                    },
                    { 
                        label: 'Quick Ratio', 
                        value: finData.quickRatio ? finData.quickRatio.toFixed(2) : 'N/A',
                        description: 'Liquidez imediata da empresa.',
                        history: getQuarterlyHistory(result.balanceSheetHistoryQuarterly, 'cash', 5).map(h => {
                            const balanceData = result.balanceSheetHistoryQuarterly?.find(b => b.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: balanceData?.totalCurrentLiabilities ? 
                                    (h.value / balanceData.totalCurrentLiabilities).toFixed(2) : 'N/A'
                            };
                        })
                    },
                    { 
                        label: 'Current Ratio', 
                        value: finData.currentRatio ? finData.currentRatio.toFixed(2) : 'N/A',
                        description: 'Liquidez corrente da empresa.',
                        history: getQuarterlyHistory(result.balanceSheetHistoryQuarterly, 'totalCurrentAssets', 5).map(h => {
                            const balanceData = result.balanceSheetHistoryQuarterly?.find(b => b.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: balanceData?.totalCurrentLiabilities ? 
                                    (h.value / balanceData.totalCurrentLiabilities).toFixed(2) : 'N/A'
                            };
                        })
                    },
                    { 
                        label: 'Return on Assets', 
                        value: finData.returnOnAssets ? `${(finData.returnOnAssets * 100).toFixed(2)}%` : 'N/A',
                        description: 'Retorno sobre os ativos totais.',
                        history: getQuarterlyHistory(result.incomeStatementHistoryQuarterly, 'netIncome', 5).map(h => {
                            const balanceData = result.balanceSheetHistoryQuarterly?.find(b => b.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: balanceData?.totalAssets ? 
                                    `${((h.value / balanceData.totalAssets) * 100).toFixed(2)}%` : 'N/A'
                            };
                        })
                    },
                    { 
                        label: 'Profit Margins', 
                        value: finData.profitMargins ? `${(finData.profitMargins * 100).toFixed(2)}%` : 'N/A',
                        description: 'Margem de lucro da empresa.',
                        history: getQuarterlyHistory(result.incomeStatementHistoryQuarterly, 'grossProfit', 5).map(h => {
                            const incomeData = result.incomeStatementHistoryQuarterly?.find(i => i.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: incomeData?.totalRevenue ? 
                                    `${((h.value / incomeData.totalRevenue) * 100).toFixed(2)}%` : 'N/A'
                            };
                        })
                    },
                    { 
                        label: 'Enterprise Value', 
                        value: stats.enterpriseValue ? `R$ ${(stats.enterpriseValue / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Valor da firma.',
                        history: []
                    },
                    { 
                        label: 'Price to Book', 
                        value: stats.priceToBook ? stats.priceToBook.toFixed(2) : 'N/A',
                        description: 'Preço sobre valor patrimonial.',
                        history: getQuarterlyHistory(result.balanceSheetHistoryQuarterly, 'totalStockholderEquity', 5).map(h => {
                            const balanceData = result.balanceSheetHistoryQuarterly?.find(b => b.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: balanceData?.sharesOutstanding ? 
                                    (result.marketCap / (h.value / balanceData.sharesOutstanding)).toFixed(2) : 'N/A'
                            };
                        })
                    },
                    { 
                        label: 'Book Value', 
                        value: stats.bookValue ? `R$ ${stats.bookValue.toFixed(2)}` : 'N/A',
                        description: 'Valor patrimonial por ação.',
                        history: getQuarterlyHistory(result.balanceSheetHistoryQuarterly, 'totalStockholderEquity', 5).map(h => {
                            const balanceData = result.balanceSheetHistoryQuarterly?.find(b => b.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: balanceData?.sharesOutstanding ? 
                                    `R$ ${(h.value / balanceData.sharesOutstanding).toFixed(2)}` : 'N/A'
                            };
                        })
                    },
                    { 
                        label: 'Total Revenue', 
                        value: finData.totalRevenue ? `R$ ${(finData.totalRevenue / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Receita total.',
                        history: getQuarterlyHistory(result.incomeStatementHistoryQuarterly, 'totalRevenue', 5).map(h => ({
                            year: h.year,
                            value: `R$ ${(h.value / 1e9).toFixed(2)}B`
                        }))
                    },
                    { 
                        label: 'Gross Margins', 
                        value: finData.grossMargins ? `${(finData.grossMargins * 100).toFixed(2)}%` : 'N/A',
                        description: 'Margem bruta.',
                        history: getQuarterlyHistory(result.incomeStatementHistoryQuarterly, 'grossProfit', 5).map(h => {
                            const incomeData = result.incomeStatementHistoryQuarterly?.find(i => i.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: incomeData?.totalRevenue ? 
                                    `${((h.value / incomeData.totalRevenue) * 100).toFixed(2)}%` : 'N/A'
                            };
                        })
                    },
                    { 
                        label: 'Operating Margins', 
                        value: finData.operatingMargins ? `${(finData.operatingMargins * 100).toFixed(2)}%` : 'N/A',
                        description: 'Margem operacional.',
                        history: getQuarterlyHistory(result.incomeStatementHistoryQuarterly, 'operatingIncome', 5).map(h => {
                            const incomeData = result.incomeStatementHistoryQuarterly?.find(i => i.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: incomeData?.totalRevenue ? 
                                    `${((h.value / incomeData.totalRevenue) * 100).toFixed(2)}%` : 'N/A'
                            };
                        })
                    },
                    { 
                        label: 'Net Income', 
                        value: (result.incomeStatementHistoryQuarterly && result.incomeStatementHistoryQuarterly[0] && result.incomeStatementHistoryQuarterly[0].netIncome) ? `R$ ${(result.incomeStatementHistoryQuarterly[0].netIncome / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Lucro líquido.',
                        history: getQuarterlyHistory(result.incomeStatementHistoryQuarterly, 'netIncome', 5).map(h => ({
                            year: h.year,
                            value: `R$ ${(h.value / 1e9).toFixed(2)}B`
                        }))
                    },
                    { 
                        label: 'Total Cash', 
                        value: finData.totalCash ? `R$ ${(finData.totalCash / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Caixa total.',
                        history: getQuarterlyHistory(result.balanceSheetHistoryQuarterly, 'cash', 5).map(h => ({
                            year: h.year,
                            value: `R$ ${(h.value / 1e9).toFixed(2)}B`
                        }))
                    },
                    { 
                        label: 'Total Debt', 
                        value: finData.totalDebt ? `R$ ${(finData.totalDebt / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Dívida total.',
                        history: getQuarterlyHistory(result.balanceSheetHistoryQuarterly, 'totalLiab', 5).map(h => ({
                            year: h.year,
                            value: `R$ ${(h.value / 1e9).toFixed(2)}B`
                        }))
                    },
                    { 
                        label: 'Free Cash Flow', 
                        value: finData.freeCashflow ? `R$ ${(finData.freeCashflow / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Fluxo de caixa livre.',
                        history: []
                    },
                    { 
                        label: 'Operating Cash Flow', 
                        value: finData.operatingCashflow ? `R$ ${(finData.operatingCashflow / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Fluxo de caixa operacional.',
                        history: []
                    },
                    { 
                        label: 'Total Assets', 
                        value: (result.balanceSheetHistoryQuarterly && result.balanceSheetHistoryQuarterly[0] && result.balanceSheetHistoryQuarterly[0].totalAssets) ? `R$ ${(result.balanceSheetHistoryQuarterly[0].totalAssets / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Ativos totais.',
                        history: getQuarterlyHistory(result.balanceSheetHistoryQuarterly, 'totalAssets', 5).map(h => ({
                            year: h.year,
                            value: `R$ ${(h.value / 1e9).toFixed(2)}B`
                        }))
                    },
                    { 
                        label: 'Total Liabilities', 
                        value: (result.balanceSheetHistoryQuarterly && result.balanceSheetHistoryQuarterly[0] && result.balanceSheetHistoryQuarterly[0].totalLiab) ? `R$ ${(result.balanceSheetHistoryQuarterly[0].totalLiab / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Passivos totais.',
                        history: getQuarterlyHistory(result.balanceSheetHistoryQuarterly, 'totalLiab', 5).map(h => ({
                            year: h.year,
                            value: `R$ ${(h.value / 1e9).toFixed(2)}B`
                        }))
                    },
                    { 
                        label: 'Shares Outstanding', 
                        value: stats.sharesOutstanding ? stats.sharesOutstanding.toLocaleString() : 'N/A',
                        description: 'Ações em circulação.',
                        history: []
                    },
                    { 
                        label: 'Trailing EPS', 
                        value: stats.trailingEps ? `R$ ${stats.trailingEps.toFixed(2)}` : 'N/A',
                        description: 'Lucro por ação (trailing).',
                        history: getQuarterlyHistory(result.incomeStatementHistoryQuarterly, 'netIncome', 5).map(h => {
                            const balanceData = result.balanceSheetHistoryQuarterly?.find(b => b.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: balanceData?.sharesOutstanding ? 
                                    `R$ ${(h.value / balanceData.sharesOutstanding).toFixed(2)}` : 'N/A'
                            };
                        })
                    },
                    { 
                        label: 'Net Income to Common', 
                        value: stats.netIncomeToCommon ? `R$ ${(stats.netIncomeToCommon / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Lucro líquido atribuído aos acionistas comuns.',
                        history: getQuarterlyHistory(result.incomeStatementHistoryQuarterly, 'netIncomeApplicableToCommonShares', 5).map(h => ({
                            year: h.year,
                            value: `R$ ${(h.value / 1e9).toFixed(2)}B`
                        }))
                    },
                    { 
                        label: 'Forward P/E', 
                        value: stats.forwardPE ? stats.forwardPE.toFixed(2) : 'N/A',
                        description: 'P/L projetado.',
                        history: []
                    },
                    { 
                        label: 'PEG Ratio', 
                        value: stats.pegRatio ? stats.pegRatio.toFixed(2) : 'N/A',
                        description: 'Razão PEG.',
                        history: []
                    },
                    { 
                        label: 'Enterprise to Revenue', 
                        value: stats.enterpriseToRevenue ? stats.enterpriseToRevenue.toFixed(2) : 'N/A',
                        description: 'EV/Receita.',
                        history: []
                    },
                    { 
                        label: 'Enterprise to EBITDA', 
                        value: stats.enterpriseToEbitda ? stats.enterpriseToEbitda.toFixed(2) : 'N/A',
                        description: 'EV/EBITDA.',
                        history: []
                    },
                    { 
                        label: 'Target Mean Price', 
                        value: finData.targetMeanPrice ? `R$ ${finData.targetMeanPrice.toFixed(2)}` : 'N/A',
                        description: 'Preço-alvo médio.',
                        history: []
                    },
                    { 
                        label: 'Revenue Growth', 
                        value: finData.revenueGrowth ? `${(finData.revenueGrowth * 100).toFixed(2)}%` : 'N/A',
                        description: 'Crescimento da receita.',
                        history: []
                    },
                    { 
                        label: 'Cash', 
                        value: (result.balanceSheetHistoryQuarterly && result.balanceSheetHistoryQuarterly[0] && result.balanceSheetHistoryQuarterly[0].cash) ? `R$ ${(result.balanceSheetHistoryQuarterly[0].cash / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Caixa.',
                        history: getQuarterlyHistory(result.balanceSheetHistoryQuarterly, 'cash', 5).map(h => ({
                            year: h.year,
                            value: `R$ ${(h.value / 1e9).toFixed(2)}B`
                        }))
                    },
                    { 
                        label: 'Inventory', 
                        value: (result.balanceSheetHistoryQuarterly && result.balanceSheetHistoryQuarterly[0] && result.balanceSheetHistoryQuarterly[0].inventory) ? `R$ ${(result.balanceSheetHistoryQuarterly[0].inventory / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Estoque.',
                        history: getQuarterlyHistory(result.balanceSheetHistoryQuarterly, 'inventory', 5).map(h => ({
                            year: h.year,
                            value: `R$ ${(h.value / 1e9).toFixed(2)}B`
                        }))
                    },
                    { 
                        label: 'Gross Profit', 
                        value: (result.incomeStatementHistoryQuarterly && result.incomeStatementHistoryQuarterly[0] && result.incomeStatementHistoryQuarterly[0].grossProfit) ? `R$ ${(result.incomeStatementHistoryQuarterly[0].grossProfit / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Lucro bruto.',
                        history: getQuarterlyHistory(result.incomeStatementHistoryQuarterly, 'grossProfit', 5).map(h => ({
                            year: h.year,
                            value: `R$ ${(h.value / 1e9).toFixed(2)}B`
                        }))
                    },
                    { 
                        label: 'Price to Sales (P/S)', 
                        value: (result.marketCap && finData.totalRevenue) ? (result.marketCap / finData.totalRevenue).toFixed(2) : 'N/A',
                        description: 'Preço sobre vendas.',
                        history: []
                    },
                    { 
                        label: 'Net Debt', 
                        value: (finData.totalDebt && finData.totalCash) ? `R$ ${((finData.totalDebt - finData.totalCash) / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Dívida líquida.',
                        history: getQuarterlyHistory(result.balanceSheetHistoryQuarterly, 'totalLiab', 5).map(h => {
                            const balanceData = result.balanceSheetHistoryQuarterly?.find(b => b.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: balanceData?.cash ? 
                                    `R$ ${((h.value - balanceData.cash) / 1e9).toFixed(2)}B` : 'N/A'
                            };
                        })
                    },
                    { 
                        label: 'Debt to Assets', 
                        value: ((result.balanceSheetHistoryQuarterly && result.balanceSheetHistoryQuarterly[0] && result.balanceSheetHistoryQuarterly[0].totalLiab) && (result.balanceSheetHistoryQuarterly[0].totalAssets)) ? `${((result.balanceSheetHistoryQuarterly[0].totalLiab / result.balanceSheetHistoryQuarterly[0].totalAssets) * 100).toFixed(2)}%` : 'N/A',
                        description: 'Dívida sobre ativos.',
                        history: getQuarterlyHistory(result.balanceSheetHistoryQuarterly, 'totalLiab', 5).map(h => {
                            const balanceData = result.balanceSheetHistoryQuarterly?.find(b => b.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: balanceData?.totalAssets ? 
                                    `${((h.value / balanceData.totalAssets) * 100).toFixed(2)}%` : 'N/A'
                            };
                        })
                    },
                    { 
                        label: 'Equity (Patrimônio Líquido)', 
                        value: ((result.balanceSheetHistoryQuarterly && result.balanceSheetHistoryQuarterly[0] && result.balanceSheetHistoryQuarterly[0].totalAssets) && result.balanceSheetHistoryQuarterly[0].totalLiab) ? `R$ ${((result.balanceSheetHistoryQuarterly[0].totalAssets - result.balanceSheetHistoryQuarterly[0].totalLiab) / 1e9).toFixed(2)}B` : 'N/A',
                        description: 'Patrimônio líquido.',
                        history: getQuarterlyHistory(result.balanceSheetHistoryQuarterly, 'totalStockholderEquity', 5).map(h => ({
                            year: h.year,
                            value: `R$ ${(h.value / 1e9).toFixed(2)}B`
                        }))
                    },
                    { 
                        label: 'Price to Cash Flow', 
                        value: (result.marketCap && finData.operatingCashflow) ? (result.marketCap / finData.operatingCashflow).toFixed(2) : 'N/A',
                        description: 'Preço sobre fluxo de caixa.',
                        history: []
                    },
                    { 
                        label: 'EV to Sales', 
                        value: (stats.enterpriseValue && finData.totalRevenue) ? (stats.enterpriseValue / finData.totalRevenue).toFixed(2) : 'N/A',
                        description: 'EV sobre vendas.',
                        history: []
                    },
                    { 
                        label: 'Net Profit Margin', 
                        value: ((result.incomeStatementHistoryQuarterly && result.incomeStatementHistoryQuarterly[0] && result.incomeStatementHistoryQuarterly[0].netIncome) && finData.totalRevenue) ? `${((result.incomeStatementHistoryQuarterly[0].netIncome / finData.totalRevenue) * 100).toFixed(2)}%` : 'N/A',
                        description: 'Margem de lucro líquido.',
                        history: getQuarterlyHistory(result.incomeStatementHistoryQuarterly, 'netIncome', 5).map(h => {
                            const incomeData = result.incomeStatementHistoryQuarterly?.find(i => i.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: incomeData?.totalRevenue ? 
                                    `${((h.value / incomeData.totalRevenue) * 100).toFixed(2)}%` : 'N/A'
                            };
                        })
                    },
                    { 
                        label: 'Cash Flow Margin', 
                        value: (finData.operatingCashflow && finData.totalRevenue) ? `${((finData.operatingCashflow / finData.totalRevenue) * 100).toFixed(2)}%` : 'N/A',
                        description: 'Margem de fluxo de caixa.',
                        history: []
                    },
                    { 
                        label: 'Inventory Turnover', 
                        value: (finData.totalRevenue && (result.balanceSheetHistoryQuarterly && result.balanceSheetHistoryQuarterly[0] && result.balanceSheetHistoryQuarterly[0].inventory)) ? (finData.totalRevenue / result.balanceSheetHistoryQuarterly[0].inventory).toFixed(2) : 'N/A',
                        description: 'Rotatividade de estoque.',
                        history: getQuarterlyHistory(result.incomeStatementHistoryQuarterly, 'totalRevenue', 5).map(h => {
                            const balanceData = result.balanceSheetHistoryQuarterly?.find(b => b.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: balanceData?.inventory ? 
                                    (h.value / balanceData.inventory).toFixed(2) : 'N/A'
                            };
                        })
                    },
                    { 
                        label: 'EBITDA to Sales', 
                        value: (finData.ebitda && finData.totalRevenue) ? `${((finData.ebitda / finData.totalRevenue) * 100).toFixed(2)}%` : 'N/A',
                        description: 'EBITDA sobre vendas.',
                        history: getQuarterlyHistory(result.incomeStatementHistoryQuarterly, 'ebitda', 5).map(h => {
                            const incomeData = result.incomeStatementHistoryQuarterly?.find(i => i.endDate.includes(h.year.split(' ')[0]));
                            return {
                                year: h.year,
                                value: incomeData?.totalRevenue ? 
                                    `${((h.value / incomeData.totalRevenue) * 100).toFixed(2)}%` : 'N/A'
                            };
                        })
                    }
                ];
                
                const naCount = indicators.filter(ind => ind.value === 'N/A').length;
                
                if (naCount > indicators.length / 2 && !retry) {
                    console.log(`Muitos N/A para ${ticker}, tentando novamente...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return await fetchData(true);
                }
                
                res.json({
                    ticker,
                    name: result.longName || result.shortName || ticker,
                    categories: categorizeIndicators(indicators).map(cat => ({
                        ...cat,
                        indicators: cat.indicators.map(ind => ({
                            label: ind.label_pt,
                            value: ind.value,
                            description: ind.description,
                            history: ind.history
                        }))
                    }))
                });
            } else {
                res.status(404).json({ error: 'Ticker não encontrado' });
            }
        } catch (error) {
            console.error('Erro na BRAPI:', error);
            res.status(500).json({ error: 'Erro ao buscar dados' });
        }
    };
    
    await fetchData();
});

app.get('/api/company-cards', async (req, res) => {
    const tickers = req.query.tickers;
    if (!tickers) return res.status(400).json({ error: 'Tickers obrigatórios' });
    
    const token = process.env.BRAPI_DEV;
    if (!token) return res.status(500).json({ error: 'Chave BRAPI não configurada' });
    
    try {
        const response = await axios.get(`https://brapi.dev/api/quote/${tickers}?token=${token}`);
        const data = response.data;
        if (data.results) {
            const companies = data.results.map(result => ({
                name: result.longName || result.shortName,
                ticker: result.symbol,
                variation: result.regularMarketChangePercent || 0
            }));
            res.json(companies);
        } else {
            res.status(404).json({ error: 'Tickers não encontrados' });
        }
    } catch (error) {
        console.error('Erro na BRAPI:', error);
        res.status(500).json({ error: 'Erro ao buscar dados' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor BRAPI rodando na porta ${PORT}`);
});