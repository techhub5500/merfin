# Configuração do app.js para Render

## ✅ Adequações Realizadas

O arquivo `app.js` foi adequado para funcionar tanto no **localhost** quanto no **Render** automaticamente.

### 🔧 Alteração Principal

Adicionada detecção automática de ambiente no início do arquivo:

```javascript
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://seu-servidor.onrender.com';
```

### 📝 O que você precisa fazer:

1. **Após fazer deploy do servidor no Render**, copie a URL do servidor (exemplo: `https://meu-servidor.onrender.com`)

2. **Abra o arquivo `app.js`** e na linha 5, substitua:
   ```javascript
   : 'https://seu-servidor.onrender.com'; // ALTERAR para URL do seu servidor no Render
   ```
   
   Por:
   ```javascript
   : 'https://sua-url-real.onrender.com'; // URL do servidor no Render
   ```

3. **Salve o arquivo** e faça commit

### ✅ Como funciona:

- **No localhost**: Detecta automaticamente e usa `http://localhost:3000`
- **No Render**: Detecta automaticamente e usa a URL configurada do servidor

### 🔍 URLs substituídas:

Todas as chamadas fetch foram atualizadas de `http://localhost:3000` para `${API_URL}`:

- `/process-category`
- `/process-subcategory`
- `/login`
- `/register`
- `/chat`
- `/chat-history`
- `/chat-history/:id`
- `/delete-conversation/:id`
- `/save-chat-message`
- `/profile/:userId`

### 🧪 Testando:

**Localhost:**
```bash
# Servidor rodando
cd server
npm start

# Abra o frontend normalmente (Live Server, etc)
```

**Render:**
- Após deploy, acesse a URL do frontend
- O código detectará automaticamente que não é localhost e usará a URL do Render

### ⚠️ IMPORTANTE:

Antes de fazer deploy do frontend, **ALTERE A URL NA LINHA 5** do `app.js` com a URL real do seu servidor no Render!
