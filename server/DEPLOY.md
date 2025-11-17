# Deploy no Render - Servidor

## ✅ Adequações Realizadas

1. **Migração para ES Modules** (`type: "module"` no package.json)
2. **PORT dinâmico** (usa `process.env.PORT` do Render)
3. **CORS configurado** para produção e localhost
4. **Imports atualizados** de CommonJS para ES6

## 📋 Pré-requisitos

- Conta no [Render](https://render.com)
- Repositório Git (GitHub, GitLab ou Bitbucket)
- MongoDB (pode usar MongoDB Atlas gratuitamente)

## 🚀 Passos para Deploy

### 1. Preparar o Repositório

Faça commit e push das alterações para o GitHub:

```bash
git add .
git commit -m "Preparar servidor para deploy no Render"
git push origin main
```

### 2. Criar Web Service no Render

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Clique em **"New +"** → **"Web Service"**
3. Conecte seu repositório GitHub
4. Configure:
   - **Name**: `ia-financeira-server` (ou nome de sua preferência)
   - **Region**: Escolha a mais próxima (ex: Oregon)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### 3. Configurar Variáveis de Ambiente

Na seção **Environment**, adicione:

```
MONGO_URL=sua_url_mongodb_atlas
DEEPSICK_API=sua_chave_deepseek
NODE_ENV=production
FRONTEND_URL=https://seu-frontend.onrender.com
```

**IMPORTANTE**: Não adicione `PORT` - o Render define automaticamente!

### 4. Deploy

Clique em **"Create Web Service"** e aguarde o deploy (5-10 minutos)

### 5. Testar

Após o deploy, acesse:
```
https://seu-servidor.onrender.com
```

Você deve ver: `"Servidor funcionando!"`

## 🔄 Localhost ainda funciona?

**SIM!** O servidor detecta automaticamente o ambiente:

- **Localhost**: usa porta 3000 e aceita requisições de `http://localhost`
- **Render**: usa porta dinâmica do Render e aceita apenas do frontend configurado

Para rodar localmente:

```bash
cd server
npm run dev
```

## 📝 Notas Importantes

1. **MongoDB**: Use MongoDB Atlas para produção (gratuito até 512MB)
2. **CORS**: Atualize `FRONTEND_URL` após fazer deploy do frontend
3. **Free Tier**: O servidor dorme após 15 minutos de inatividade. Primeira requisição após inatividade leva ~30s
4. **Logs**: Acesse logs em tempo real no dashboard do Render

## 🆘 Troubleshooting

### Erro "Application failed to respond"
- Verifique se `PORT` usa `process.env.PORT`
- Confirme que o servidor está "listening" corretamente

### Erro de CORS
- Adicione a URL do frontend em `FRONTEND_URL`
- Verifique se `NODE_ENV=production`

### Erro de conexão MongoDB
- Confirme que `MONGO_URL` está correta
- Verifique whitelist de IPs no MongoDB Atlas (adicione `0.0.0.0/0`)

## 📦 Próximos Passos

Agora você precisa adequar o **frontend** para se comunicar com o servidor no Render!
