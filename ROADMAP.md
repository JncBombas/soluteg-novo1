# Roadmap Soluteg — Checklist de Execução

**Período total estimado:** 8 a 12 semanas
**Dedicação:** ~3h/dia
**Princípio:** uma fase por vez. Não pula. Não mistura.

**Última atualização:** 07/05/2026
**Fase 2 pulada deliberadamente** — hardware será definido em paralelo com Fase 3, fora do código.

---

## 🚨 FASE 1 — ALARMES FUNCIONANDO

**Estimativa:** 1 a 2 semanas
**Critério de saída:** alarme dispara de forma confiável em ambiente real, sem falsos positivos nem falsos negativos.

### Diagnóstico
- [x] Auditar logs do sistema atual: onde o alarme falha?
- [x] Identificar se o problema é detecção (sensor → backend) ou notificação (backend → cliente/admin)
- [x] Documentar todos os tipos de alarme existentes hoje
- [x] Listar bugs específicos encontrados

### Regras de negócio (definir antes de codar)
- [x] Definir tipos de alerta: aviso (WhatsApp para admin), crítico (OS automática), emergência (OS + técnico direcionado)
- [x] Definir thresholds: porcentagem de nível, tempo de inatividade do sensor, etc
- [x] Definir destinatários: quem recebe cada tipo (cliente, admin, técnico)
- [x] Definir cooldown: tempo mínimo entre dois alarmes do mesmo sensor
- [x] Documentar tudo num arquivo `ALARMS.md` no repositório

### Implementação
- [x] Refatorar lógica de detecção no backend
- [x] Implementar fila de notificações com retry
- [x] Adicionar fallback: se WhatsApp falhar 3x, enviar email
- [x] Implementar lógica de OS automática (regras claras de quando criar)
- [x] Implementar direcionamento automático ao técnico
- [x] Adicionar logs detalhados de cada disparo

### Validação
- [x] Teste em laboratório: simular nível baixo, sensor offline, sensor com dado errado
- [x] Validar que mensagens chegam no WhatsApp do admin e cliente
- [x] Validar que OS é criada corretamente
- [x] Validar que técnico é notificado
- [x] Rodar 48h em ambiente real sem falhas

**Status da fase:** [ ] Não iniciada [ ] Em andamento [x] Concluída em 04/05/2026

---

## 🔧 FASE 2 — HARDWARE DEFINIDO

**Estimativa:** 2 a 4 semanas
**Critério de saída:** kit replicável que JNC compra, monta e instala sem você presente.

### Definição de hardware
- [ ] Definir modelo final do ESP32 (revisão e fornecedor)
- [ ] Definir sensor de nível: qual modelo, qual range, qual precisão
- [ ] Definir fonte de alimentação: bateria? PoE? 220V com fonte chaveada?
- [ ] Definir conectividade: WiFi do condomínio? 4G? LoRa?
- [ ] Definir gabinete: IP65? Como prender na caixa?
- [ ] Listar BOM (Bill of Materials) completa com fornecedores

### Custos e logística
- [ ] Calcular custo unitário do kit (peças + montagem + margem)
- [ ] Definir preço de venda da instalação
- [ ] Definir preço da mensalidade
- [ ] Identificar fornecedores brasileiros confiáveis para reposição
- [ ] Comprar lote inicial de peças (3 a 5 kits)

### Processo de instalação
- [ ] Documentar passo a passo de montagem do kit
- [ ] Documentar passo a passo de instalação no condomínio
- [ ] Listar ferramentas necessárias
- [ ] Estimar tempo de instalação por unidade
- [ ] Criar checklist de instalação para o técnico
- [ ] Criar formulário de comissionamento (vincular sensor a condomínio no sistema)

### Validação
- [ ] Montar 3 kits seguindo a documentação
- [ ] Instalar 1 kit num condomínio piloto (cliente real, pagando)
- [ ] Operar por 30 dias coletando feedback
- [ ] Ajustar documentação baseado nos problemas reais

**Status da fase:** [x] Pulada deliberadamente — hardware definido fora do código, em paralelo

---

## 📱 FASE 3 — PORTAL TÉCNICO OFFLINE (PWA)

**Estimativa:** 3 a 5 semanas
**Critério de saída:** técnico no subsolo conclui OS completa offline e sincroniza ao sair.

### Preparação
- [x] Estudar arquitetura PWA: Service Worker + IndexedDB
- [x] Definir o que precisa funcionar offline: visualizar OS, preencher checklist, fotos, assinaturas
- [x] Definir o que NÃO funciona offline: criar nova OS, fotos precisam de internet apenas para upload (captura é offline), Concluir requer online
- [x] Mapear todas as mutations tRPC do portal técnico

### Implementação base (Sub-fase 3.1 — concluída 05/05/2026)
- [x] Configurar Vite PWA plugin no projeto Soluteg (`vite-plugin-pwa`, `registerType: autoUpdate`)
- [x] Criar manifest.json: "Soluteg Técnico", scope `/technician`, start_url `/technician/login`, tema `#141820`
- [x] Configurar Service Worker: Workbox, NetworkOnly para `/api/`, pré-cache do bundle inteiro
- [x] Prompt de instalação `<InstallPWAPrompt>` no portal do técnico
- [x] PWA instalável também no portal do cliente ("Soluteg Cliente", manifest separado, mesmo SW)

### Cache de leitura (Sub-fase 3.2 — concluída 05/05/2026)
- [x] Implementar IndexedDB (`soluteg-offline`) para dados das OS (lib `idb`)
- [x] Implementar download proativo: ao entrar no portal, baixar OS atribuídas
- [x] `useOfflineOrderDetail`: detalhe da OS lido do IndexedDB quando offline
- [x] Botão "Atualizar OS offline" no header com timestamp de última sync
- [x] Banner amarelo quando offline, invisível quando online

### Lógica offline (Sub-fase 3.3 — concluída 06/05/2026)
- [x] Detectar status online/offline com `useOnlineStatus()` (window online/offline events)
- [x] Indicador visual claro (banner amarelo: "Modo offline — alterações serão sincronizadas ao voltar")
- [x] Fila de mutations pendentes no IndexedDB (`pendingMutations`)
- [x] Lógica de sincronização ao voltar online — auto-sync global em `App.tsx` (qualquer tela)
- [x] Tratamento de conflitos: técnico vence (payload completo sobrescreve)
- [x] Badge de pendentes no header com modal listando tipo/data/retries
- [x] Checklist offline: respostas persistidas em localStorage entre navegações
- [x] Comentários, tarefas e status enfileirados e sincronizados

### Upload de mídia offline (Sub-fase 3.4 — concluída 07/05/2026)
- [x] Salvar fotos no IndexedDB como Blob (store `pendingMedia`)
- [x] Preview local via `URL.createObjectURL()` com badge "Offline"
- [x] Upload assíncrono ao Cloudinary via `processMediaQueue()` ao reconectar
- [x] Retry automático (máx. 3 tentativas com backoff)
- [x] Assinatura do técnico offline: enfileirada + localStorage + indicador visual
- [x] Assinatura do cliente offline: idem
- [x] Concluir bloqueado offline (evita OS fechada com fotos/dados na fila)
- [x] Limpeza de blobs antigos (> 7 dias) ao iniciar o app
- [x] Detecção de `QuotaExceededError` com alerta ao usuário
- [x] Compressão preparada e desabilitada por padrão (`COMPRESS_PHOTOS = false`)

### Push notifications
- [ ] Configurar VAPID keys ← deliberadamente adiado (PWA cobre o uso em campo)
- [ ] Backend envia push quando admin atribui nova OS
- [ ] Notificação aparece mesmo com app fechado
- [ ] Click na notificação abre a OS no portal

### Polimento (Sub-fase 3.5 — pendente)
- [ ] Página `/technician/offline-status`: OS baixadas, mutations pendentes, tamanho do IndexedDB
- [ ] Botão "Forçar sincronização" e "Limpar dados offline"
- [ ] Log de erros persistente (store `errorLog`, rolling buffer 100 entradas)
- [ ] Lighthouse PWA score > 90

### Validação (feita em campo — 06/05–07/05/2026)
- [x] Técnico testou offline: OS visível sem rede
- [x] Checklist preenchido offline: dados persistem entre navegações
- [x] Fotos capturadas offline: preview aparece, upload automático ao reconectar
- [x] Assinaturas técnico e cliente offline: indicador visual, persistência, sync
- [x] Status da OS alterado offline: sincroniza ao voltar online
- [ ] Validação formal em subsolo real com admin confirmando dados (pendente)

### Bonus (adiado)
- [ ] Reorganizar portal técnico em abas: OS / Orçamentos / Laudos
- [ ] Adicionar filtros por status dentro de cada aba

**Status da fase:** [ ] Não iniciada [x] Em andamento (sub-fase 3.5 pendente) [ ] Concluída em ___/___/___

---

## 🚀 FASE 4 — VALIDAÇÃO COMERCIAL

**Estimativa:** 4 a 8 semanas (sobrepõe parcialmente com Fase 3)
**Critério de saída:** 3 a 5 condomínios pagando mensalidade, com 30+ dias de uso real sem você apagando incêndio.

### Piloto comercial
- [ ] Selecionar 3 a 5 condomínios da carteira JNC para piloto pago
- [ ] Apresentar proposta com preço definido (instalação + mensalidade)
- [ ] Fechar contrato simples (1 lauda) com cada um
- [ ] Instalar com a documentação da Fase 2
- [ ] Configurar usuários, perfis, alertas

### Operação
- [ ] Acompanhar primeiros 7 dias de cada instalação de perto
- [ ] Documentar todos os problemas que aparecerem
- [ ] Coletar feedback semanal dos síndicos
- [ ] Coletar feedback dos técnicos JNC

### Métricas a acompanhar
- [ ] Tempo médio de resposta a alertas
- [ ] Quantidade de OS abertas automaticamente
- [ ] Quantidade de chamadas evitadas (estimativa)
- [ ] NPS do síndico no fim de 30 dias

**Status da fase:** [ ] Não iniciada [ ] Em andamento [ ] Concluída em ___/___/___

---

## 📢 FASE 5 — LANDING SOLUTEG

**Estimativa:** 1 a 2 semanas
**Critério de entrada:** Fase 4 concluída, com pelo menos 3 cases reais.
**Critério de saída:** site no ar com depoimentos reais e preços definidos.

- [ ] Coletar depoimentos reais dos síndicos do piloto (com foto, nome, condomínio)
- [ ] Compilar números reais (X% de redução de chamados, Y litros economizados)
- [ ] Definir tabela de preços final
- [ ] Executar os prompts da landing soluteg.com.br
- [ ] Deploy no VPS (mesmo fluxo do jnc.soluteg.com.br)
- [ ] Configurar Google Analytics + Search Console
- [ ] Submeter sitemap

**Status da fase:** [ ] Não iniciada [ ] Em andamento [ ] Concluída em ___/___/___

---

## ❌ EXPLICITAMENTE FORA DESTE ROADMAP

Adiados deliberadamente para não desviar foco:

- ❌ App mobile nativo (PWA cobre 90% do uso)
- ❌ Integração Claude/IA no sistema (hype, não resolve problema real)
- ❌ Integração PDV/OS (não bloqueia venda)
- ❌ Calendário do técnico (manual resolve enquanto for poucos técnicos)
- ❌ Animação de abertura no portal cliente (acabamento estético)
- ❌ UI/UX ultra-moderna do portal cliente (Fase 4 vai dizer se importa)
- ❌ Ajustes finais da landing JNC (já está no ar, suficiente por enquanto)

**Regra:** se sentir vontade de mexer em algo dessa lista, escreve numa nota e volta para a fase atual. Esses itens só voltam à mesa depois da Fase 5.

---

## 📊 INDICADOR GERAL DE PROGRESSO

[x] Fase 1 — Alarmes              Concluída ✅ 04/05/2026
[x] Fase 2 — Hardware             Pulada deliberadamente
[~] Fase 3 — PWA Offline          Sub-fases 3.1–3.4 concluídas ✅ | Sub-fase 3.5 (polimento) pendente
[ ] Fase 4 — Validação comercial  0/13 itens
[ ] Fase 5 — Landing Soluteg      0/7 itens

---

## 📝 LOG DE PROGRESSO

### Sessão 05–07/05/2026 — Fase 3 (Sub-fases 3.1 a 3.4)
- Sub-fase 3.1: PWA instalável — `vite-plugin-pwa`, manifest Soluteg Técnico, InstallPWAPrompt, correção auth redirect 401, URL tRPC via `window.location.origin`
- Sub-fase 3.2: Cache IndexedDB — `offlineDB.ts`, `useOfflineOrders`, `ConnectionStatus`, botão sync offline com timestamp
- Sub-fase 3.3: Fila de mutations — `syncQueue.ts`, `trpcStandalone.ts`, `useAutoSync` global em App.tsx, checklist localStorage, auto-sync em qualquer tela
- Sub-fase 3.4: Fotos e assinaturas — `pendingMedia` (Blob no IndexedDB), `processMediaQueue`, assinatura técnico/cliente offline com localStorage, Concluir bloqueado offline, PWA portal do cliente (`manifest-client.webmanifest`)
- Múltiplos bugs corrigidos: TDZ do useEffect, timing do localStorage, SW interferia com Cloudinary, `isComplete` faltava no payload offline, `saveClientSignature` adicionada ao syncQueue
- Validado em campo pelo usuário

### Sessão 04/05/2026
- Diagnóstico completo: WhatsApp falhava silenciosamente (alerta perdido para sempre quando !isReady)
- Definidas regras de negócio por tipo de caixa (superior/inferior) para alarm1, alarm2, SCI e alarm3_boia
- Mensagens contextuais por tipo: alarm1 superior orienta verificar cisterna/painel; alarm1 inferior orienta verificar entrada de água
- alarm2 cria OS emergencial automaticamente + notifica admin e cliente
- Implementada fila de retry: alertas com delivered=0 são reenviados ao WhatsApp reconectar
- Fallback email via nodemailer quando WhatsApp falha
- alarm3_boia toggle por sensor (habilitável/desabilitável na UI)
- Fix: listSensorsWithStatus não retornava alarm3BoiaPct, tankType, distVazia, distCheia (formulário de edição sempre em branco)
- Fix crítico: multer (upload) nunca foi instanciado em index.ts — causava crash no boot do servidor
- Fix crítico: 2 bugs impediam o alarme de disparar (primeira leitura e nível travado em 0%)
- Direcionamento automático ao técnico: technicianId no sensor, WhatsApp específico + OS já atribuída
- Migrations 0039 e 0040 criadas (rodar no VPS)
