import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração CORS
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://merfin-home.onrender.com']
        : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Servir arquivos estáticos da pasta client
app.use(express.static(path.join(__dirname, '../client')));

// Definir esquema para usuários
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  userId: { type: String, unique: true, required: true },
  status: { type: String, default: 'ativo_pendente', enum: ['ativo', 'ativo_pendente', 'pendente_pagamento', 'cancelado'] }
});

const User = mongoose.model('User', userSchema);


// Conectar ao MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('Conectado ao MongoDB'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Definir esquemas
const profileSchema = new mongoose.Schema({
  userId: String,
  pessoal: Object,
  financeira: Object,
  objetivos: Object
});

const transactionSchema = new mongoose.Schema({
  userId: String,
  type: String, // 'receitas' ou 'despesas'
  subType: String, // 'recorrente', 'variavel', 'fixa' (para despesas)
  mesReferencia: String, // Mês de referência no formato 'YYYY-MM' (ex: '2025-11')
  diaLancamento: Number, // Dia do mês para lançamentos recorrentes (1-31)
  ultimoLancamento: Date, // Data do último lançamento automático
  data: Date,
  timestamp: String, // ISO string com hora, minuto e segundo para ordenação precisa
  status: String, // Status da transação: Recebido/Pendente/Atrasado (receitas) ou Pago/Pendente/Vencido (despesas)
  fonteOuDescricao: String,
  valor: Number,
  categoria: String,
  subcategoria: String, // Novo campo
  metodo: String,
  notas: String
});

const Profile = mongoose.model('Profile', profileSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

// Schema para Anotações
const notesSchema = new mongoose.Schema({
  userId: String,
  notes: Object // Estrutura: { pageNumber: [linha1, linha2, linha3, linha4, linha5] }
});

const Notes = mongoose.model('Notes', notesSchema);

// Schema para Histórico de Chat
const chatMessageSchema = new mongoose.Schema({
  userId: String,
  conversationId: String,
  message: String,
  sender: String, // 'user' ou 'bot'
  timestamp: Date
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);



app.post('/register', async (req, res) => {
  const { email, password, nome, nascimento, contato } = req.body;
  try {
    // Validação básica - todos os campos obrigatórios
    if (!email || !password || !nome || !nascimento || !contato) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    // Verificar se o email já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Usuário já existe' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Gerar userId único (ex.: UUID)
    const { v4: uuidv4 } = await import('uuid');
    const userId = uuidv4();

    // Criar novo usuário com status padrão ativo_pendente
    const newUser = new User({ email, password: hashedPassword, userId, status: 'ativo_pendente' });
    await newUser.save();

    // Criar perfil inicial com dados extras
    const initialProfile = {
      userId,
      pessoal: { nome, nascimento, contato },
      financeira: {},
      objetivos: {}
    };
    const profile = new Profile(initialProfile);
    await profile.save();

    res.status(201).json({ message: 'Usuário cadastrado com sucesso', userId });
  } catch (error) {
    console.error('Erro ao cadastrar:', error);
    res.status(500).json({ message: 'Erro ao cadastrar usuário' });
  }
});

// Rota para login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Validação básica
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário por email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Usuário não encontrado' });
    }

    // Verificar senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Senha incorreta' });
    }

    // Verificar status do usuário
    if (user.status === 'pendente_pagamento') {
      return res.status(403).json({ 
        message: 'Acesso bloqueado',
        status: 'pendente_pagamento',
        notification: 'Há pendências no pagamento. Seu acesso está temporariamente bloqueado.'
      });
    }

    if (user.status === 'cancelado') {
      return res.status(403).json({ 
        message: 'Assinatura cancelada',
        status: 'cancelado',
        notification: 'Sua assinatura foi cancelada. Entre em contato conosco para mais informações.'
      });
    }

    // Status ativo ou ativo_pendente - acesso liberado
    res.status(200).json({ message: 'Login bem-sucedido', userId: user.userId, status: user.status });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

// Funções auxiliares para mês
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function detectMonthInMessage(message) {
  const lowerMessage = message.toLowerCase();
  
  // Detectar referências comuns
  if (lowerMessage.includes('mês passado') || lowerMessage.includes('mes passado')) {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  
  if (lowerMessage.includes('outubro') && lowerMessage.includes('2025')) {
    return '2025-10';
  }
  
  if (lowerMessage.includes('novembro') && lowerMessage.includes('2025')) {
    return '2025-11';
  }
  
  // Detectar formato YYYY-MM
  const monthMatch = message.match(/(\d{4}-\d{2})/);
  if (monthMatch) {
    return monthMatch[1];
  }
  
  return null; // Usar mês corrente
}

// Função para calcular dados do dashboard (mês atual)
function calculateDashboardData(transactions, profile, mesReferencia) {
  let totalReceitas = 0;
  let totalDespesas = 0;
  const receitasPorCategoria = {};
  const despesasPorCategoria = {};
  const receitasPorSubcategoria = {};
  const despesasPorSubcategoria = {};

  transactions.forEach(t => {
    if (t.type === 'receitas') {
      totalReceitas += t.valor;
      receitasPorCategoria[t.categoria] = (receitasPorCategoria[t.categoria] || 0) + t.valor;
      const subKey = `${t.categoria} > ${t.subcategoria}`;
      receitasPorSubcategoria[subKey] = (receitasPorSubcategoria[subKey] || 0) + t.valor;
    } else if (t.type === 'despesas') {
      totalDespesas += t.valor;
      despesasPorCategoria[t.categoria] = (despesasPorCategoria[t.categoria] || 0) + t.valor;
      const subKey = `${t.categoria} > ${t.subcategoria}`;
      despesasPorSubcategoria[subKey] = (despesasPorSubcategoria[subKey] || 0) + t.valor;
    }
  });

  const saldoLiquido = totalReceitas - totalDespesas;

  // Calcular percentuais
  const percentuaisReceitas = {};
  Object.keys(receitasPorCategoria).forEach(cat => {
    percentuaisReceitas[cat] = ((receitasPorCategoria[cat] / totalReceitas) * 100).toFixed(1) + '%';
  });

  const percentuaisDespesas = {};
  Object.keys(despesasPorCategoria).forEach(cat => {
    percentuaisDespesas[cat] = ((despesasPorCategoria[cat] / totalDespesas) * 100).toFixed(1) + '%';
  });

  // Patrimônio total (se disponível no perfil)
  let patrimonioTotal = 0;
  if (profile && profile.financeira && profile.financeira.patrimonio) {
    patrimonioTotal = profile.financeira.patrimonio.reduce((sum, item) => sum + parseFloat(item.valor.replace(/[^\d,]/g, '').replace(',', '.')), 0);
  }

  return {
    mesReferencia,
    totais: {
      receitas: `R$ ${totalReceitas.toFixed(2)}`,
      despesas: `R$ ${totalDespesas.toFixed(2)}`,
      saldoLiquido: `R$ ${saldoLiquido.toFixed(2)}`,
      patrimonio: `R$ ${patrimonioTotal.toFixed(2)}`
    },
    percentuaisReceitas,
    percentuaisDespesas,
    receitasPorCategoria,
    despesasPorCategoria,
    receitasPorSubcategoria,
    despesasPorSubcategoria
  };
}

// Função para calcular saldo acumulado até um mês de referência
function calculateAccumulatedBalance(userId, mesReferencia) {
  return Transaction.find({
    userId,
    mesReferencia: { $lte: mesReferencia }
  }).then(transactions => {
    let totalReceitas = 0;
    let totalDespesas = 0;

    transactions.forEach(t => {
      if (t.type === 'receitas' && t.status === 'Recebido') {
        totalReceitas += t.valor;
      } else if (t.type === 'despesas' && t.status === 'Pago') {
        totalDespesas += t.valor;
      }
    });

    return totalReceitas - totalDespesas;
  });
}

// Rota para chat com DeepSeek
app.post('/chat', async (req, res) => {
  const { message, userId, conversationId } = req.body;
  try {
    // Buscar dados do usuário no MongoDB
    const profile = await Profile.findOne({ userId });
    const transactions = await Transaction.find({ userId }).sort({ data: -1 }).limit(10); // Últimas 10 transações
    const dividas = await Divida.findOne({ userId }); // Buscar dívidas do usuário

    // Determinar mês para dashboard (corrente por padrão, ou detectado na mensagem)
    let dashboardMonth = getCurrentMonth();
    const requestedMonth = detectMonthInMessage(message);
    if (requestedMonth) {
      dashboardMonth = requestedMonth;
    }

    // Buscar transações do mês para dashboard
    const dashboardTransactions = await Transaction.find({
      userId,
      mesReferencia: dashboardMonth
    });

    // Calcular dados do dashboard (mês atual)
    const dashboardData = calculateDashboardData(dashboardTransactions, profile, dashboardMonth);

    // Calcular saldo acumulado até o mês atual
    const saldoAcumulado = await calculateAccumulatedBalance(userId, dashboardMonth);

    // Atualizar o dashboardData com o saldo acumulado correto
    dashboardData.totais.saldoLiquido = `R$ ${saldoAcumulado.toFixed(2)}`;

    // Buscar histórico da conversa atual (últimas 4 mensagens)
    const conversationHistory = await ChatMessage.find({
      conversationId,
      userId
    }).sort({ timestamp: -1 }).limit(4).sort({ timestamp: 1 }); // Buscar últimas 4, depois ordenar cronologicamente

    // Construir contexto financeiro expandido
    let context = `Você é Merfin, uma IA especializada em organização e planejamento financeiro, criada pela Merfin. Ajude o usuário com suas finanças de forma clara e útil. Jamais diga que voce é a deppsick, voce foi criada pela empresa merfin.

Não empurre informações ou analises logo de cara, a não ser que o usuario pedir. Por exemplo: Se o usuairo mandar um "oi" como vai", responda de forma breve e educada, sem entrar em detalhes financeiros.

Não repita saudações desnecessárias como "Olá" ou cumprimentos iniciais. Responda diretamente à mensagem atual, considerando o histórico da conversa para manter a continuidade natural.

Todas as suas respostas devem ser baseadas nos dados financeiros do usuário (perfil, transações, dashboard) e nos objetivos financeiros definidos, fornecendo conselhos personalizados e alinhados com a saúde financeira atual.

Sua prioridade máxima é proteger os objetivos financeiros do usuário. Seja firme e responsável: questione gastos impulsivos, mostre consequências reais e priorize metas acima de vontades momentâneas.

Para perguntas sobre gastos: "Antes de liberar, pergunte o que é o item, por quê e se é essencial. Mostre como o gasto afeta metas (ex.: 'Isso comprometerá sua poupança de R$ X nos próximos meses'). Sugira alternativas (ex.: cortar despesas em 'Lazer')."

Ênfase em realidade: "Se o comportamento atual não alinha com objetivos, seja claro e direto da consequencia que isso pode trazer, mas ofereça planos de ajuste."

Flexibilidade: "Seja flexível para necessidades essenciais (ex.: saúde, trabalho), mas sempre com alertas e planos de compensação."

Quando sugerir cortes ou ajustes, foque em planos contingenciais para meses futuros, não em alterar transações já realizadas no mês atual.

Dados financeiros do usuário:

PERFIL:
`;
    if (profile) {
      context += `Informações pessoais: ${JSON.stringify(profile.pessoal)}\n`;
      // Excluir saldo em conta corrente/poupança
      const financeiraSemSaldo = { ...profile.financeira };
      delete financeiraSemSaldo['saldo-conta'];
      context += `Situação financeira: ${JSON.stringify(financeiraSemSaldo)}\n`;
      context += `Objetivos financeiros: ${JSON.stringify(profile.objetivos)}\n`;
    }

    // Incluir dívidas no contexto
    context += `Dívidas e Parcelamentos Ativos: ${JSON.stringify(dividas?.dividas || [])}\n`;

    context += `
DASHBOARD DO MÊS ${dashboardMonth === getCurrentMonth() ? 'CORRENTE' : 'SOLICITADO'} (${dashboardMonth}):
${JSON.stringify(dashboardData)}

Data atual: ${new Date().toLocaleDateString('pt-BR')} (${new Date().toISOString().split('T')[0]})

Nota importante sobre os dados financeiros:
- O saldo líquido mostrado é ACUMULADO desde o início de todas as transações até o mês atual (receitas recebidas - despesas pagas).
- Os valores de receitas e despesas no dashboard representam apenas o mês atual.
- Para calcular o saldo de UM MÊS ESPECÍFICO, você deve analisar as transações daquele mês individualmente.
- Use a data atual para contextualizar (ex.: início do mês, meio do mês, final do mês) ao dar conselhos sobre planejamento futuro.

TRANSAÇÕES RECENTES:
`;
    if (transactions.length > 0) {
      transactions.forEach(t => {
        context += `${t.type} (${t.subType}): ${t.fonteOuDescricao} - R$ ${t.valor} (${t.data.toISOString().split('T')[0]}) - ${t.status}\n`;
      });
    }

    // Adicionar histórico da conversa se existir
    if (conversationHistory.length > 0) {
      context += `\n\nHISTÓRICO DA CONVERSA ATUAL:\n`;
      conversationHistory.forEach(msg => {
        const sender = msg.sender === 'user' ? 'Usuário' : 'Merfin';
        context += `${sender}: ${msg.message}\n`;
      });
    }

    context += `
Mensagem atual do usuário: ${message}`;

    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: context }],
      max_tokens: 500 // Aumentado para respostas mais completas
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSICK_API}`,
        'Content-Type': 'application/json'
      }
    });
    res.json({ reply: response.data.choices[0].message.content });
  } catch (error) {
    console.error('Erro na API DeepSeek:', error);
    res.status(500).send('Erro ao processar mensagem da IA');
  }
});

app.post('/process-category', async (req, res) => {
  const { description, categories, userId } = req.body;
  try {
      // Validação básica
      if (!description || !categories || !userId) {
        return res.status(400).json({ error: 'Descrição, categorias e userId são obrigatórios' });
      }

      // Prompt para IA escolher categoria
      const prompt = `Baseado na descrição: "${description}". Escolha a categoria mais adequada de: ${categories.join(', ')}. Responda apenas com o nome exato da categoria.`;

      // Chamar IA
      const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50 // Limitado para resposta curta
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSICK_API}`,
          'Content-Type': 'application/json'
        }
      });

      const category = response.data.choices[0].message.content.trim();
      res.json({ category });
  } catch (error) {
      console.error('Erro ao processar categoria:', error);
      res.status(500).json({ error: 'Erro ao processar categoria com IA' });
  }
});

// Nova rota para processar subcategoria e extrair dados (etapa 2)
app.post('/process-subcategory', async (req, res) => {
  const { description, category, subcategories, userId } = req.body;
  try {
      // Validação básica
      if (!description || !category || !subcategories || !userId) {
        return res.status(400).json({ error: 'Descrição, categoria, subcategorias e userId são obrigatórios' });
      }

      // Obter data atual
      const today = new Date().toISOString().split('T')[0];

      // Determinar se é receita ou despesa baseado na categoria
      const isReceita = req.body.isReceita !== undefined ? req.body.isReceita : true;
      
      // Prompt para IA escolher subcategoria e extrair dados (MODIFICADO para múltiplas transações)
      const prompt = `Hoje é ${today}. Descrição: "${description}". Categoria escolhida: "${category}". Escolha a subcategoria mais adequada de: ${subcategories.join(', ')}. 

IMPORTANTE: A descrição pode conter múltiplas transações separadas por ponto e vírgula (;). Trate cada parte separada por ; como uma transação independente. Retorne um ARRAY de objetos JSON, um para cada transação.

Para CADA transação, extraia:
- category: "${category}"
- subcategory: nome da subcategoria mais adequada
- data: formato YYYY-MM-DD (use ${today} se não informado)
- descricao: descrição limpa e resumida
- valor: valor numérico (apenas números, sem "R$" ou símbolos)
- status: ${isReceita ? 'Para RECEITAS, identifique o status. Valores EXATOS possíveis: "Recebido" (se já recebeu/recebeu), "Pendente" (se vai receber/aguardando), "Atrasado" (se atrasado). Use "Recebido" se a descrição indicar que já recebeu (ex: "recebi", "ganhei").' : 'Para DESPESAS, identifique o status. Valores EXATOS possíveis: "Pago" (se já pagou), "Pendente" (se vai pagar/aguardando), "Vencido" (se venceu/atrasado). Use "Pago" se a descrição indicar que já pagou (ex: "paguei", "gastei").'}
- metodo: APENAS para despesas, identifique o método de pagamento. Valores EXATOS possíveis: "pix", "dinheiro", "cartão débito", "cartão crédito". Se não for mencionado, use "pix" como padrão. Para receitas, NÃO inclua este campo.
- notas: informações adicionais relevantes (opcional)

Formato de resposta:
- Se houver MÚLTIPLAS transações: [{"category": "${category}", "subcategory": "...", "data": "...", "descricao": "...", "valor": "...", "status": "...", "metodo": "...", "notas": "..."}, {...}]
- Se houver apenas UMA transação: [{"category": "${category}", "subcategory": "...", "data": "...", "descricao": "...", "valor": "...", "status": "...", "metodo": "...", "notas": "..."}]

Responda APENAS com o array JSON, sem texto adicional.`;

      // Chamar IA
      const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500 // Aumentado para suportar múltiplas transações
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSICK_API}`,
          'Content-Type': 'application/json'
        }
      });

      // Validar resposta da API
      if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        console.error('Resposta da IA inválida:', JSON.stringify(response.data));
        return res.status(500).json({ error: 'Resposta da IA inválida' });
      }

      const rawReply = response.data.choices[0].message.content.trim();
      console.log('Resposta da IA:', rawReply); // Log para debug
      
      // Validar se há conteúdo
      if (!rawReply || rawReply.length === 0) {
        console.warn('Resposta da IA vazia');
        return res.json([{
          data: new Date().toISOString().split('T')[0],
          status: '',
          fonteOuDescricao: description,
          valor: 'R$ 0,00',
          categoria: category,
          subcategoria: subcategories[0] || 'Sem subcategoria',
          notas: 'Processamento manual necessário'
        }]);
      }
      
      // Tentar parsear JSON (agora esperando um array)
      const jsonStart = rawReply.indexOf('[');
      const jsonEnd = rawReply.lastIndexOf(']') + 1;
      
      // Validar se encontrou JSON válido
      if (jsonStart === -1 || jsonEnd === 0 || jsonStart >= jsonEnd) {
        console.warn('Resposta da IA sem JSON válido:', rawReply);
        return res.json([{
          data: new Date().toISOString().split('T')[0],
          status: '',
          fonteOuDescricao: description,
          valor: 'R$ 0,00',
          categoria: 'Sem categoria',
          subcategoria: 'Sem subcategoria',
          notas: 'Processamento manual necessário'
        }]);
      }
      
      const jsonString = rawReply.substring(jsonStart, jsonEnd);
      
      // Tentar fazer o parse com tratamento de erro
      let result;
      try {
        result = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Erro ao fazer parse do JSON:', jsonString);
        return res.json([{
          data: new Date().toISOString().split('T')[0],
          status: '',
          fonteOuDescricao: description,
          valor: 'R$ 0,00',
          categoria: 'Sem categoria',
          subcategoria: 'Sem subcategoria',
          notas: 'Erro no processamento'
        }]);
      }

      // Garantir que sempre retorne um array
      const resultArray = Array.isArray(result) ? result : [result];

      res.json(resultArray);
  } catch (error) {
      console.error('Erro ao processar subcategoria:', error.message);
      console.error('Stack:', error.stack);
      
      // Retornar resposta padrão em caso de erro
      res.json([{
        data: new Date().toISOString().split('T')[0],
        status: '',
        fonteOuDescricao: description || 'Descrição não disponível',
        valor: 'R$ 0,00',
        categoria: category || 'Sem categoria',
        subcategoria: (subcategories && subcategories[0]) || 'Sem subcategoria',
        notas: 'Erro no processamento - favor preencher manualmente'
      }]);
  }
});

// Rotas para salvar dados
app.post('/save-profile', async (req, res) => {
  try {
    const { userId, section, data } = req.body;
    const update = { [section]: data };
    await Profile.findOneAndUpdate({ userId }, update, { upsert: true, new: true });
    res.status(200).send('Perfil salvo com sucesso');
  } catch (error) {
    res.status(500).send('Erro ao salvar perfil');
  }
});

app.post('/save-transaction', async (req, res) => {
  try {
    const transactionData = req.body;
    
    // Se mesReferencia não foi fornecido, extrair da data
    if (!transactionData.mesReferencia && transactionData.data) {
      const dataObj = new Date(transactionData.data);
      transactionData.mesReferencia = `${dataObj.getFullYear()}-${String(dataObj.getMonth() + 1).padStart(2, '0')}`;
    }
    
    console.log('💾 Salvando nova transação:', transactionData);
    const transaction = new Transaction(transactionData);
    const saved = await transaction.save();
    console.log('✅ Transação salva:', saved._id, 'Mês:', saved.mesReferencia);
    res.status(200).json({ message: 'Transação salva com sucesso', id: saved._id });
  } catch (error) {
    console.error('Erro ao salvar transação:', error);
    res.status(500).send('Erro ao salvar transação');
  }
});

// Rota para atualizar transação existente
app.put('/update-transaction/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // IMPORTANTE: Buscar a transação existente para preservar o mesReferencia original
    const existingTransaction = await Transaction.findById(id);
    
    if (!existingTransaction) {
      console.log('❌ Transação não encontrada:', id);
      return res.status(404).send('Transação não encontrada');
    }
    
    // Preservar o mesReferencia original - NÃO permitir mudança de mês
    updateData.mesReferencia = existingTransaction.mesReferencia;
    
    console.log('🔄 UPDATE recebido - ID:', id);
    console.log('📝 Dados para atualizar:', updateData);
    console.log('🔒 Mês original preservado:', existingTransaction.mesReferencia);
    
    const updated = await Transaction.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      console.log('❌ Transação não encontrada:', id);
      return res.status(404).send('Transação não encontrada');
    }
    
    console.log('✅ Transação atualizada:', updated._id, 'Mês:', updated.mesReferencia);
    res.status(200).json({ message: 'Transação atualizada com sucesso', id: updated._id });
  } catch (error) {
    console.error('❌ Erro ao atualizar transação:', error);
    res.status(500).send('Erro ao atualizar transação');
  }
});

// Rota para buscar transações por userId (com filtro opcional de mês)
app.get('/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { mesReferencia } = req.query;
    
    const query = { userId };
    
    // Se mês de referência foi fornecido, filtrar por ele
    if (mesReferencia) {
      query.mesReferencia = mesReferencia;
    }
    
    const transactions = await Transaction.find(query);
    res.json(transactions);
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).send('Erro ao buscar transações');
  }
});

app.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await Profile.findOne({ userId });
    res.json(profile || { pessoal: {}, financeira: {}, objetivos: {} });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).send('Erro ao buscar perfil');
  }
});

// Definir esquema para dívidas
const dividaSchema = new mongoose.Schema({
  userId: String,
  dividas: Array
});

const Divida = mongoose.model('Divida', dividaSchema);

// ...existing code...

// Rota para deletar transação por ID
app.delete('/transaction/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Transaction.findByIdAndDelete(id);
    res.status(200).send('Transação deletada com sucesso');
  } catch (error) {
    console.error('Erro ao deletar transação:', error);
    res.status(500).send('Erro ao deletar transação');
  }
});

// Rotas para dívidas
app.get('/dividas/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const dividaDoc = await Divida.findOne({ userId });
    res.json(dividaDoc?.dividas || []);
  } catch (error) {
    console.error('Erro ao buscar dívidas:', error);
    res.status(500).send('Erro ao buscar dívidas');
  }
});

app.post('/save-dividas', async (req, res) => {
  try {
    const { userId, dividas } = req.body;
    await Divida.findOneAndUpdate(
      { userId },
      { dividas },
      { upsert: true, new: true }
    );
    res.status(200).send('Dívidas salvas com sucesso');
  } catch (error) {
    console.error('Erro ao salvar dívidas:', error);
    res.status(500).send('Erro ao salvar dívidas');
  }
});

// Rotas para Anotações
app.get('/notes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notesDoc = await Notes.findOne({ userId });
    res.json(notesDoc || { notes: {} });
  } catch (error) {
    console.error('Erro ao buscar anotações:', error);
    res.status(500).send('Erro ao buscar anotações');
  }
});

app.post('/save-notes', async (req, res) => {
  try {
    const { userId, notes } = req.body;
    await Notes.findOneAndUpdate(
      { userId },
      { notes },
      { upsert: true, new: true }
    );
    res.status(200).send('Anotações salvas com sucesso');
  } catch (error) {
    console.error('Erro ao salvar anotações:', error);
    res.status(500).send('Erro ao salvar anotações');
  }
});

// Endpoint para salvar mensagens do chat
app.post('/save-chat-message', async (req, res) => {
  const { message, sender, userId, timestamp, conversationId: providedConversationId } = req.body;
  try {
    // Usar conversationId fornecido ou gerar baseado na data (fallback)
    let conversationId;
    if (providedConversationId) {
      conversationId = providedConversationId;
    } else {
      const date = new Date(timestamp);
      conversationId = `${userId}_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    const chatMessage = new ChatMessage({
      userId,
      conversationId,
      message,
      sender,
      timestamp: new Date(timestamp)
    });

    await chatMessage.save();
    res.status(200).send('Mensagem salva com sucesso');
  } catch (error) {
    console.error('Erro ao salvar mensagem:', error);
    res.status(500).send('Erro ao salvar mensagem');
  }
});

// Endpoint para obter histórico de conversas
app.get('/chat-history', async (req, res) => {
  const { userId } = req.query;
  try {
    // Agrupar mensagens por conversationId e obter a mais recente de cada conversa
    const conversations = await ChatMessage.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$conversationId',
          date: { $max: '$timestamp' },
          messages: { $push: { message: '$message', sender: '$sender', timestamp: '$timestamp' } }
        }
      },
      { $sort: { date: -1 } }
    ]);

    // Formatar resposta
    const formattedConversations = conversations.map(conv => {
      const messages = conv.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const firstUserMessage = messages.find(m => m.sender === 'user');
      const title = firstUserMessage ? firstUserMessage.message.substring(0, 50) + (firstUserMessage.message.length > 50 ? '...' : '') : 'Conversa sem título';
      
      return {
        id: conv._id,
        title,
        date: conv.date,
        preview: messages.slice(-1)[0]?.message.substring(0, 100) + (messages.slice(-1)[0]?.message.length > 100 ? '...' : '') || ''
      };
    });

    res.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Erro ao obter histórico:', error);
    res.status(500).send('Erro ao obter histórico');
  }
});

// Endpoint para obter mensagens de uma conversa específica
app.get('/chat-history/:conversationId', async (req, res) => {
  const { conversationId } = req.params;
  const { userId } = req.query;
  try {
    const messages = await ChatMessage.find({ 
      conversationId, 
      userId 
    }).sort({ timestamp: 1 });

    const formattedMessages = messages.map(msg => ({
      text: msg.message,
      sender: msg.sender,
      timestamp: msg.timestamp
    }));

    res.json({ messages: formattedMessages });
  } catch (error) {
    console.error('Erro ao obter conversa:', error);
    res.status(500).send('Erro ao obter conversa');
  }
});

// Endpoint para excluir uma conversa
app.delete('/delete-conversation/:conversationId', async (req, res) => {
  const { conversationId } = req.params;
  const { userId } = req.query;
  try {
    await ChatMessage.deleteMany({ conversationId, userId });
    res.status(200).send('Conversa excluída com sucesso');
  } catch (error) {
    console.error('Erro ao excluir conversa:', error);
    res.status(500).send('Erro ao excluir conversa');
  }
});

// ========== ROTAS PARA HISTÓRICO DO CHAT MODAL ==========

// Rota existente
app.get('/', (req, res) => {
  res.send('Servidor funcionando!');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});