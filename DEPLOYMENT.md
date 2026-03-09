# Guia de Deployment do Soluteg

Este documento descreve como fazer deploy das alterações do Soluteg no VPS.

## Informações do VPS

| Informação | Valor |
|-----------|-------|
| **Host** | 129.121.36.243 |
| **Porta SSH** | 22022 |
| **Usuário** | root |
| **Diretório da App** | /var/www/soluteg/backend |
| **Processo PM2** | soluteg-sistema |
| **Domínio** | jnc.soluteg.com.br |
| **Banco de Dados** | MySQL em 69.6.213.57:3306 |

## Deployment Automático

O método mais fácil é usar o script de deploy automático:

```bash
./deploy-vps.sh
```

Este script irá:
1. Fazer push das alterações para o GitHub
2. Conectar ao VPS e fazer pull das alterações
3. Instalar dependências com `pnpm install`
4. Compilar o TypeScript com `pnpm run build`
5. Reiniciar a aplicação com PM2
6. Verificar se a aplicação está respondendo

## Deployment Manual

Se preferir fazer o deployment manualmente, siga os passos abaixo:

### 1. Fazer Push para o GitHub

```bash
cd /home/ubuntu/soluteg-novo1
git add -A
git commit -m "Sua mensagem de commit"
git push origin main
```

### 2. Conectar ao VPS

```bash
ssh -p 22022 root@129.121.36.243
```

### 3. Atualizar o Código

```bash
cd /var/www/soluteg/backend
git pull origin main
```

### 4. Instalar Dependências

```bash
pnpm install
```

### 5. Compilar o Projeto

```bash
# Para VPS (usa base path '/')
DEPLOY_ENV=vps pnpm run build
```

### 6. Reiniciar a Aplicação

```bash
# Parar a aplicação
pm2 stop soluteg-sistema

# Iniciar a aplicação
pm2 start soluteg-sistema

# Verificar status
pm2 status soluteg-sistema

# Ver logs
pm2 logs soluteg-sistema
```

## Variáveis de Ambiente

### DEPLOY_ENV

Controla o base path do Vite:

- `DEPLOY_ENV=vps` → base path é `/` (para VPS)
- `DEPLOY_ENV=github-pages` → base path é `/soluteg-novo1/` (para GitHub Pages)

**Exemplo:**
```bash
DEPLOY_ENV=vps pnpm run build
```

## Verificar Status da Aplicação

### Ver logs em tempo real

```bash
pm2 logs soluteg-sistema
```

### Ver status do processo

```bash
pm2 status soluteg-sistema
```

### Acessar a aplicação

- **URL:** https://jnc.soluteg.com.br
- **Admin:** admin / admin123
- **Cliente padrão:** 123456

## Troubleshooting

### A aplicação não está respondendo

1. Verificar logs:
   ```bash
   pm2 logs soluteg-sistema
   ```

2. Reiniciar a aplicação:
   ```bash
   pm2 restart soluteg-sistema
   ```

3. Verificar se a porta 3000 está aberta:
   ```bash
   netstat -tlnp | grep 3000
   ```

### Erro de conexão com banco de dados

1. Verificar se o banco de dados está acessível:
   ```bash
   mysql -h 69.6.213.57 -u d5ea2e96_jncdb -p d5ea2e96_jncdb
   ```

2. Verificar as variáveis de ambiente:
   ```bash
   cat /var/www/soluteg/backend/.env | grep DATABASE_URL
   ```

### Erro ao fazer build

1. Limpar node_modules:
   ```bash
   rm -rf node_modules
   pnpm install
   ```

2. Tentar build novamente:
   ```bash
   DEPLOY_ENV=vps pnpm run build
   ```

## Correções Recentes

### 1. Bug de Edição de Cliente

**Problema:** Admin não conseguia editar dados do cliente.

**Solução:** 
- Adicionada validação de existência do cliente em `updateClient()`
- Melhorado tratamento de erros no endpoint `clients.update`

**Arquivo:** `server/db.ts` (linha 432-443)

### 2. Campo de Senha para Cliente

**Problema:** O campo de senha já estava implementado, mas com tratamento de erro inadequado.

**Solução:**
- Adicionada validação de existência do cliente em `updateClientPassword()`
- Melhorado tratamento de erros no endpoint `clients.updatePassword`

**Arquivo:** `server/db.ts` (linha 494-505)

### 3. Otimização do vite.config.ts

**Problema:** O base path era hardcoded como `/soluteg-novo1/`, causando problemas no VPS.

**Solução:**
- Configurado base path dinâmico usando `DEPLOY_ENV`
- Para VPS: `DEPLOY_ENV=vps` → base path = `/`
- Para GitHub Pages: `DEPLOY_ENV=github-pages` → base path = `/soluteg-novo1/`

**Arquivo:** `vite.config.ts` (linha 13)

## Commits Relacionados

- `4581af2`: Fix: Corrigir bugs de edição de cliente e otimizar vite.config.ts
- `915d33f`: Merge: Resolver conflito de merge no vite.config.ts

## Contato

Para dúvidas ou problemas com o deployment, consulte a documentação do projeto ou entre em contato com o desenvolvedor.
