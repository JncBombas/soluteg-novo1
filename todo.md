# Soluteg - Lista de Tarefas

## Área Pública (Portfólio)
- [x] Criar estrutura de navegação principal
- [x] Implementar seção Hero com título e logo
- [x] Implementar seção Quem Somos
- [x] Implementar seção Serviços (4 cards)
- [x] Implementar seção Manutenção Industrial
- [x] Implementar seção Manutenção Predial
- [x] Implementar seção Fabricação e Retrofit de Painéis
- [x] Adicionar formulário de contato
- [x] Integrar botão WhatsApp
- [x] Adicionar rodapé com informações da empresa
- [x] Configurar cores da marca (laranja/dourado e preto)
- [x] Adicionar logos e imagens do site original

## Área Administrativa (Relatórios)
- [x] Criar schema do banco de dados para relatórios
- [x] Implementar autenticação e proteção de rotas
- [x] Criar dashboard administrativo com DashboardLayout
- [x] Criar formulário de preenchimento de relatórios
- [x] Implementar listagem de relatórios criados
- [x] Implementar visualização de relatórios individuais
- [ ] Implementar edição de relatórios (placeholder adicionado)
- [x] Implementar exclusão de relatórios
- [ ] Adicionar filtros e busca de relatórios

## Testes e Finalização
- [x] Criar testes unitários para procedures principais
- [x] Testar fluxo completo de autenticação
- [x] Testar CRUD de relatórios
- [x] Validar responsividade do site
- [x] Criar checkpoint final
- [x] Adicionar imagens reais do site original

## Gestão de Usuários (Nova)
- [x] Desabilitar inscrições abertas
- [x] Criar painel administrativo de gestão de usuários
- [x] Implementar CRUD de usuários (criar, editar, deletar)
- [x] Configurar soluteggeradores@gmail.com como administrador
- [x] Testar painel de gestão de usuários

## Otimização Mobile (Nova)
- [x] Otimizar DashboardLayout para telas pequenas
- [x] Ajustar formulários para mobile
- [x] Melhorar navegação em dispositivos móveis
- [x] Testar área administrativa no celular

## Integração de Contato (Nova)
- [x] Adicionar botão de acesso á área administrativa na página pública
- [x] Integrar WhatsApp nos botões de contato
- [x] Integrar e-mail nos botões de contato
- [x] Testar links de contato

## Sistema de Login Próprio (Nova)
- [x] Criar sistema de autenticação com e-mail e senha
- [x] Implementar página de login customizada
- [x] Proteger rotas administrativas
- [x] Adicionar criptografia de senha
- [ ] Testar segurança do login

## Melhorias de UX (Nova)
- [x] Adicionar navegação para voltar á página inicial
- [x] Criar menu de usuário logado com nome e logout
- [x] Substituir botão de admin por ícone de usuário quando logado
- [x] Implementar envio de convites por e-mail
- [x] Implementar envio de convites por WhatsApp
- [x] Criar página de aceitação de convite

## Integração de Convites (Nova)
- [x] Implementar procedure para aceitar convite
- [x] Criar conta de usuário ao aceitar convite
- [x] Validar código de convite expirado
- [ ] Testar fluxo completo de convite

## Recuperação de Senha (Nova)
- [x] Implementar procedure de solicitar reset de senha
- [x] Criar página de reset de senha
- [x] Enviar e-mail com link de reset
- [x] Validar token de reset expirado
- [ ] Testar fluxo de recuperação

## Dashboard com Estatísticas (Nova)
- [x] Criar componente de estatísticas
- [x] Adicionar gráfico de relatórios por mês
- [x] Adicionar gráfico de serviços mais solicitados
- [x] Mostrar total de relatórios criados
- [x] Mostrar atividades recentes

## Envio de E-mail Real (Nova)
- [x] Integrar serviço de e-mail da plataforma Manus
- [x] Enviar e-mail com link de convite ao criar convite
- [ ] Testar recebimento de e-mail
- [ ] Validar link de aceitação funciona corretamente

## Portal do Cliente (Nova)
- [x] Criar schema de banco de dados para clientes e documentos
- [x] Implementar gerenciamento de clientes (admin) - criar/editar/deletar
- [x] Implementar página de login do cliente
- [x] Implementar página privada do cliente com visualização de documentos
- [x] Implementar listagem e download de documentos
- [x] Implementar página de upload de documentos (admin)
- [x] Criar endpoints da API para clientes e documentos
- [x] Testar fluxo completo de cliente (criar cliente, fazer login, visualizar docs)
- [x] Corrigir salvamento de adminId no localStorage
- [x] Testar responsividade em desktop, mobile e tablet
- [x] Testar todos os botões e funcionalidades


## Testes em Tablet (Nova)
- [x] Testar navegação em modo tablet
- [x] Identificar e corrigir texto embaralhado na navbar
- [x] Verificar botões de acesso admin em tablet
- [x] Testar fluxo completo de criar usuário em tablet
- [x] Adicionar botões de gerenciamento de clientes no dashboard
- [x] Testar responsividade em mobile e tablet


## Edição de Dados e Troca de Senha (Nova)
- [x] Adicionar queries para editar cliente
- [x] Adicionar queries para trocar senha do cliente
- [x] Criar página de edição de cliente (admin)
- [x] Criar página de perfil do cliente
- [x] Implementar troca de senha (cliente)
- [x] Integrar páginas ao sistema de navegação
- [x] Adicionar botão de editar na tabela de clientes (admin)
- [x] Adicionar botão de perfil no portal do cliente


## Navegação e Indicador de Login (Nova)
- [x] Adicionar botão de voltar ao dashboard na página de clientes
- [x] Adicionar indicador de login na página inicial
- [x] Manter login ao voltar para home (não deslogar)
- [x] Adicionar botão "Sair" na página inicial para deslogar
- [x] Salvar email do admin no localStorage
- [x] Mostrar email do admin no indicador de login
- [x] Clicar no indicador de login deve ir ao dashboard (não deslogar)


## Login Admin - Melhorias (Nova)
- [x] Mudar login de e-mail para username/login
- [x] Adicionar checkbox "Lembrar login"
- [x] Salvar login no localStorage quando checkbox ativado
- [x] Carregar login salvo ao abrir página de login


## Indicador de Login Customizado (Nova)
- [x] Adicionar campo customLabel no banco de dados para admin
- [x] Criar procedure para atualizar customLabel
- [x] Exibir label customizado no indicador de login da Home
- [x] Salvar label customizado no localStorage
- [x] Carregar label customizado ao fazer login


## Página de Edição de Label Customizado (Nova)
- [x] Criar página AdminEditCustomLabel
- [x] Adicionar formulário para editar label customizado
- [x] Integrar ao sistema de navegação do admin
- [x] Adicionar botão de acesso na página de perfil do admin


## Redesign da Página de Login do Cliente (Nova)
- [x] Analisar design do site e extrair estilos
- [x] Redesenhar página de login com estilo do site
- [x] Adicionar logo JNC
- [x] Adicionar header com logo e nome da empresa
- [x] Implementar formulário com estilo profissional


## Botão Portal do Cliente na Home (Nova)
- [x] Adicionar botão "Portal do Cliente" na navbar da página inicial
- [x] Adicionar em desktop, tablet e mobile


## Gestão de Documentos (Nova)
- [x] Adicionar queries para listar e gerenciar documentos
- [x] Criar página AdminManageDocuments
- [x] Implementar tabela com listagem de documentos
- [x] Implementar filtros por cliente e tipo
- [x] Implementar funcionalidade de editar documento
- [x] Implementar funcionalidade de deletar documento
- [x] Implementar funcionalidade de substituir documento (upload novo)
- [x] Integrar ao sistema de navegação
- [x] Adicionar botão no dashboard


## Publicação Final (Nova)
- [x] Testar envio de documentos (admin)
- [x] Testar visualização de documentos (cliente)
- [x] Testar download de documentos (cliente)
- [x] Corrigir gerenciamento de documentos - filtro e listagem
- [ ] Publicar versão final do site


## Bugs - Login do Cliente (Corrigidos)
- [x] Sistema de login do cliente não funciona com credenciais alteradas
- [x] Mudar username do cliente de e-mail para nome
- [x] Testar login com nome como username

## Bugs - Login do Cliente com Novo Nome (Corrigido)
- [x] Login do cliente funciona com novo nome "Cliente Novo"
- [x] Redirecionamento para página do portal está funcionando perfeitamente


## Melhorias nos Filtros de Documentos (Nova)
- [x] Implementar busca case-insensitive no backend (LOWER() no SQL)
- [x] Adicionar botão "Filtrar" no portal do cliente
- [x] Adicionar botão "Filtrar" na área administrativa
- [x] Remover busca automática ao digitar (onChange)
- [x] Testar filtros com maiúsculas e minúsculas


## Sistema de Dois Tipos de Clientes (Nova)
- [x] Adicionar campo 'type' na tabela de clientes (com_portal / sem_portal)
- [x] Adicionar select de tipo na página de gerenciamento de clientes
- [x] Implementar validação de acesso ao portal baseada no tipo
- [x] Bloquear acesso ao portal para clientes sem_portal
- [x] Adicionar opção de abrir OS no portal para clientes com_portal
- [ ] Permitir admin abrir OS para ambos os tipos
- [ ] Testar acesso ao portal com ambos os tipos
- [ ] Testar abertura de OS pelo portal


## Bugs Encontrados (Nova)
- [x] Botões "Ver" e "Editar" de OS retornam 404 - páginas não existem
- [x] Logout do admin não funciona - continua logado após clicar em "Sair" no dashboard


## Endpoints de API para Ordens de Servico (Nova)
- [x] Criar endpoint GET /api/work-orders/:id
- [x] Criar endpoint PUT /api/work-orders/:id
- [x] Criar endpoint POST /api/work-orders (para clientes)
- [x] Testar ambos os endpoints


## Redesign Página Inicial para Condomínios (Nova)
- [x] Redesenhar hero section com foco em condomínios
- [x] Criar seção de problemas e soluções
- [x] Criar seção de serviços detalhada com ícones
- [x] Adicionar seção de confiança (anos de experiência, clientes)
- [x] Criar seção de FAQ
- [x] Adicionar CTAs estratégicos (WhatsApp, telefone, formulário)
- [x] Testar responsividade mobile
- [x] Testar navegação e interação


## Bug: Abas de Documentos Removidas (Urgente)
- [x] Restaurar abas de documentos (vistoria, visita, nota fiscal, servico, rel. servico, rel. visita)
- [x] Adicionar filtro de busca independente em cada aba
- [x] Testar filtros funcionando corretamente em cada aba


## Bug: Filtro de Abas Nao Funciona Corretamente (Urgente)
- [x] Corrigir logica para mostrar apenas documentos do tipo correto em cada aba
- [x] Remover secao de filtros globais de cima
- [x] Testar se documentos aparecem apenas na aba correta


## Dashboard Metrics & Documento Desaparecido (Nova)
- [x] Investigar se documento do Parque dos Coqueiros foi deletado ou está oculto (estava no banco, tipos de documento estavam errados)
- [x] Implementar métricas no dashboard (total clientes, OS abertas, documentos)
- [x] Adicionar cards de estatísticas com ícones
- [x] Adicionar tipos de documento faltantes ao schema (vistoria, visita, servico, etc)
- [x] Criar endpoint /api/admin-metrics
- [x] Testar métricas com dados reais


## Melhorias Críticas de Segurança e UX (Nova)
- [x] Implementar busca global no header do admin
- [x] Adicionar confirmação antes de deletar clientes
- [x] Adicionar confirmação antes de deletar documentos
- [x] Adicionar confirmação antes de deletar OS
- [x] Validar dados com Zod em /api/client-login
- [x] Validar dados com Zod em /api/admin-clients
- [x] Validar dados com Zod em /api/admin-clients/:id
- [x] Validar dados com Zod em /api/admin-clients/:id (DELETE)
- [x] Validar dados com Zod em endpoints de documentos
- [x] Validar dados com Zod em endpoints de work orders


## Problemas Críticos Encontrados - Melhorias (Nova)
- [x] Adicionar paginação nas tabelas de clientes, documentos e OS
- [x] Adicionar loading states em componentes (spinners, skeletons)
- [x] Adicionar feedback visual com toasts em todas as operações
- [x] Adicionar badges coloridas de status nas OS (aberta, em_andamento, concluida, cancelada)
- [x] Melhorar tratamento de erros com try/catch em todos os endpoints
- [x] Adicionar proteção CSRF com tokens
- [ ] Adicionar refresh de token para sessões expiradas
- [ ] Implementar logs estruturados para debugging
- [ ] Adicionar validação de autorização nos endpoints
- [ ] Implementar cache de queries para melhor performance


## Alteracao de Validacao de Cliente (Nova)
- [x] Tornar email opcional no cadastro de cliente
- [x] Tornar telefone obrigatorio no cadastro de cliente
- [x] Tornar CNPJ obrigatorio no cadastro de cliente


## Formulários de Relatórios Internos (Nova)
- [x] Investigar página de Relatórios e links do Google Forms
- [x] Criar componentes de formulários de relatórios
- [x] Adicionar rotas para os formulários
- [x] Adicionar botões na página de Relatórios
- [x] Testar formulários e navegação

## Atualização de Informações de Contato (Nova)
- [x] Atualizar telefone para 13 98130-1010
- [x] Atualizar WhatsApp para https://wa.me/message/UIVQB7X2QY2NN1
- [x] Adicionar email financeiro@soluteg.com.br
- [x] Testar todos os links de contato

## Máscaras e Validação de CNPJ/CPF e Telefone (Nova)
- [x] Adicionar máscara de entrada para CNPJ/CPF
- [x] Adicionar máscara de entrada para Telefone
- [x] Implementar validação de CNPJ/CPF
- [x] Implementar validação de Telefone
- [x] Testar máscaras e validação no cadastro de cliente

## Página de Edição de Cliente (Nova)
- [x] Criar página EditClient.tsx
- [x] Implementar carregamento de dados do cliente
- [x] Implementar formulário com máscaras e validação
- [x] Implementar função de atualização de cliente
- [x] Testar página de edição

## Melhoria de Filtro de Documentos (Nova)
- [x] Melhorar filtro com busca por nome/tipo
- [x] Adicionar ícones por tipo de documento
- [x] Implementar ordenação por data
- [x] Testar filtro e ícones

## Sistema Completo de Ordens de Serviço (Nova)
- [x] Criar/atualizar schema de banco de dados para OS
- [x] Implementar tRPC procedures para CRUD de OS
- [x] Implementar histórico de mudanças de status
- [x] Criar painel admin de gerenciamento de OS
- [x] Criar formulários de criação de OS com recorrência
- [x] Implementar interface do cliente para criar OS
- [x] Melhorar botões de solicitação (Atendimento/Orçamento)
- [ ] Implementar job automático de recorrência (requer cron scheduler)
- [ ] Criar página de edição de OS
- [ ] Adicionar upload de anexos
- [ ] Criar relatórios de OS

## Correções no Portal do Cliente (Nova)
- [x] Verificar tipos de documentos (já existem todos os 6 tipos no schema)
- [x] Melhorar botão "Abrir OS" com dois botões separados
- [x] Adicionar botão "Solicitar Atendimento" (emergencial - vermelho)
- [x] Adicionar botão "Solicitar Orçamento" (laranja)
- [x] Atualizar diálogo com título e descrição dinâmicos
- [x] Enviar tipo correto na criação de OS

## Painel Admin de Gerenciamento de OS (Nova)
- [x] Criar página de listagem de OS com filtros (tipo, status, cliente)
- [x] Criar página de visualização detalhada de OS
- [x] Criar página de criação de OS (com suporte a recorrência)
- [ ] Criar página de edição de OS
- [x] Adicionar ações de mudança de status
- [x] Adicionar visualização de histórico de mudanças
- [x] Adicionar cancelamento de recorrência

## Implementação Sistema Completo de OS v2.0 (Seguindo Arquitetura Técnica)

### Fase 1: Fundação
- [x] Atualizar schema work_orders com todos os campos novos
- [x] Criar tabela work_order_tasks
- [x] Criar tabela work_order_materials
- [x] Criar tabela work_order_attachments
- [x] Criar tabela work_order_comments
- [x] Criar tabela work_order_time_tracking
- [x] Aplicar migrações no banco de dados

### Fase 2: CRUD Completo
- [x] Implementar procedures tRPC completas (25+ endpoints)
- [x] Criar routers para tasks, materials, attachments, comments, time tracking
- [ ] Criar página de listagem com filtros avançados
- [ ] Criar página de visualização detalhada melhorada
- [ ] Criar formulário de criação/edição completo

### Fase 3: Funcionalidades Avançadas
- [x] Criar página de visualização detalhada com tabs
- [x] Implementar componente de tarefas/checklist
- [x] Implementar componente de materiais com cálculo de custos
- [x] Implementar componente de anexos por categoria
- [x] Implementar componente de comentários (interno/externo)
- [x] Implementar componente de timeline visual
- [ ] Implementar view Kanban com drag-and-drop (próxima fase)
- [ ] Adicionar upload real de anexos para S3 (próxima fase)

### Fase 4: Financeiro e Relatórios
- [ ] Implementar cálculos financeiros automáticos
- [ ] Criar dashboard com estatísticas
- [ ] Implementar relatórios
- [ ] Adicionar geração de PDF

### Fase 5: Recorrência e Automação
- [ ] Implementar lógica de recorrência
- [ ] Criar job scheduler
- [ ] Adicionar sistema de notificações

### Fase 6: Polimento e Testes
- [ ] Testes de integração
- [ ] Otimizações de performance
- [ ] Ajustes de UI/UX

## Fase 4: Dashboard e Relatórios de OS (Concluída)
- [x] Criar procedures tRPC para métricas e estatísticas (10 endpoints)
- [x] Implementar dashboard de OS com cards de métricas
- [x] Adicionar gráficos de OS por status (PieChart)
- [x] Adicionar gráfico de OS por tipo (BarChart)
- [x] Adicionar gráfico de tempo médio de conclusão
- [x] Adicionar gráfico de custos de materiais
- [x] Adicionar gráfico de evolução mensal (LineChart)
- [x] Implementar relatório de top clientes
- [x] Adicionar lista de OS atrasadas
- [x] Criar tabs organizadas (Visão Geral, Financeiro, Desempenho, Clientes)

## Fase 5: Recorrência e Automação (Concluída)
- [x] Criar procedure para processar recorrências
- [x] Implementar lógica de criação automática de OS mensais
- [x] Criar endpoints tRPC para job de recorrência (5 procedures)
- [x] Implementar cancelamento de recorrência (apenas atual, atual + futuras)
- [x] Implementar reativação de recorrência
- [x] Criar função para obter próxima data de recorrência
- [x] Criar função para listar instâncias de uma OS recorrente

## Melhorias Finais do Sistema de OS

### Kanban View
- [x] Criar página AdminWorkOrderKanban
- [x] Implementar drag-and-drop entre colunas de status
- [x] Adicionar cards visuais com informações resumidas
- [x] Implementar filtros por tipo, prioridade, cliente
- [x] Adicionar contador de OS por coluna

### Upload de Arquivos S3
- [ ] Integrar storagePut para upload de anexos
- [ ] Criar componente de upload com preview
- [ ] Implementar categorização de anexos (antes/durante/depois)
- [ ] Adicionar galeria de imagens na visualização de OS
- [ ] Implementar download de anexos

### Geração de PDF
- [ ] Instalar biblioteca de geração de PDF
- [ ] Criar template de PDF para OS
- [ ] Implementar procedure para gerar PDF
- [ ] Adicionar botão de exportar PDF na visualização
- [ ] Incluir logo, dados, tarefas, materiais e timeline no PDF

### Sistema de Notificações
- [ ] Criar procedure para enviar notificações
- [ ] Implementar notificação de mudança de status
- [ ] Implementar notificação de OS atrasada
- [ ] Implementar notificação de aprovação de orçamento
- [ ] Adicionar preferências de notificação

### Versão Mobile/Responsiva
- [ ] Otimizar layout mobile do dashboard
- [ ] Otimizar formulários para mobile
- [ ] Otimizar visualização de OS para mobile
- [ ] Testar em diferentes tamanhos de tela
- [ ] Adicionar menu mobile hamburger se necessário

## Filtros na Lista de Ordens de Serviço (Nova)
- [x] Adicionar filtros por status (Aberta, Em Andamento, Concluída, Cancelada)
- [x] Adicionar filtro por prioridade (Baixa, Normal, Alta, Urgente)
- [ ] Adicionar filtro por cliente
- [x] Adicionar campo de busca por título/descrição
- [x] Testar filtros funcionando corretamente

### Sistema de Materiais e Preços nas OS (Nova)
- [x] Criar tabela de materiais no banco de dados
- [x] Implementar procedures tRPC para CRUD de materiais
- [x] Criar interface para adicionar materiais na OS
- [x] Adicionar campos: nome, quantidade, unidade, preço unitário
- [x] Implementar cálculo automático de subtotal por item
- [x] Implementar cálculo de total geral da OS
- [x] Adicionar visualização de lista de materiais na página de detalhes da OS
- [x] Testar adição, edição e remoção de materiais
## Correção das Abas na Página de Detalhes da OS (Bug)
- [x] Investigar por que as abas não estão sendo renderizadas
- [x] Verificar componente Tabs do shadcn/ui
- [x] Corrigir problema de renderização (rota incorreta no botão Ver)
- [x] Testar acesso à aba de Materiais
- [x] Testar todas as outras abas (Tarefas, Anexos, Comentários, Timeline)

## Otimização Mobile - Página de Ordens de Serviço
- [x] Analisar problemas de responsividade na lista de OS
- [x] Adaptar tabela de OS para cards em mobile
- [x] Otimizar filtros para telas pequenas
- [x] Melhorar layout da página de detalhes da OS em mobile
- [x] Adaptar tabela de materiais para mobile (desktop + cards mobile)
- [x] Testar em diferentes tamanhos de tela
- [ ] Verificar outras páginas do site (dashboard, clientes, documentos)

## Correções de UX e Bugs
- [ ] Remover botão duplicado "Enviar Documentos" do dashboard
- [ ] Adicionar nome do cliente na página de detalhes da OS
- [ ] Adicionar endereço do cliente na página de detalhes da OS
- [ ] Tornar data de agendamento editável
- [ ] Corrigir erro 404 do botão "Editar OS" na aba detalhes
- [ ] Melhorar navegação de abas em mobile (dropdown ou menu lateral)
- [ ] Testar todas as correções

## Correções de UX e Bugs - Janeiro 2026 (Nova)
- [x] Remover botão duplicado "Enviar Documentos" do dashboard
- [x] Adicionar nome do cliente na página de detalhes da OS
- [x] Adicionar endereço do cliente na página de detalhes da OS (condicional)
- [x] Tornar data de agendamento editável
- [x] Corrigir erro 404 do botão "Editar OS"
- [x] Melhorar navegação de abas em mobile (scroll horizontal)

## Exportação de OS em PDF (Nova)
- [ ] Criar endpoint backend para gerar PDF da OS
- [ ] Implementar template de PDF com informações da OS
- [ ] Adicionar seção de materiais no PDF
- [ ] Adicionar seção de tarefas no PDF
- [ ] Adicionar cálculo de custos totais no PDF
- [ ] Adicionar botão "Exportar PDF" na página de detalhes da OS
- [ ] Testar geração e download de PDF

## Exportação de PDF com PDFKit (Nova)
- [x] Remover Puppeteer e instalar PDFKit
- [x] Implementar gerador de PDF com PDFKit
- [x] Testar geração e download de PDF da OS

## Logo no PDF e Exportação em Lote
- [x] Adicionar logo da empresa no cabeçalho do PDF
- [x] Implementar seleção múltipla (checkboxes) na listagem de OS
- [x] Criar botão "Exportar Selecionadas" na listagem
- [x] Implementar endpoint tRPC para exportação em lote
- [x] Gerar arquivo ZIP com múltiplos PDFs
- [x] Testar exportação de múltiplas OS

## Bug: Erro 404 ao Ver OS
- [x] Investigar causa do erro 404 ao clicar em "Ver" na listagem de OS
- [x] Corrigir roteamento para página de detalhes
- [x] Testar navegação completa

## Bug: Layout do PDF incorreto
- [x] Logo deve aparecer acima do título "Ordem de Serviço"
- [x] Data deve aparecer no canto direito inferior do cabeçalho
- [x] Alinhar nome e telefone do cliente corretamente
- [x] Mostrar descrição dos materiais na tabela
- [x] Remover páginas em branco desnecessárias

## Atualização de Logo e Cores
- [x] Converter novo logo (JNC Componentes Elétricos) para PNG
- [x] Atualizar logo no site
- [x] Atualizar cores do site para combinar com logo (dourado #D4A84B, cinza escuro #3D4654)
- [x] Atualizar logo no PDF
- [x] Atualizar cores do PDF para combinar com logo
- [x] Testar site e PDF com novas cores

## Correção de Logos
- [x] Reverter logo do site para o anterior (JNC Comércio e Serviços)
- [x] Manter novo logo (JNC Componentes Elétricos) apenas no PDF
- [x] Remover fundo branco do logo no PDF
- [x] Testar PDF com logo sem fundo


## Sistema de Checklists/Formulários Genéricos
- [x] Criar schema do banco para checklists (templates e respostas)
- [x] Criar templates pré-definidos (Recalque, Dreno, Piscina, Incêndio, Gerador)
- [x] Implementar endpoints tRPC para CRUD de checklists
- [x] Criar componentes de UI para formulários dinâmicos
- [x] Implementar campos condicionais (número de bombas → correntes)
- [x] Criar componente de captura de assinatura (canvas)
- [ ] Implementar modal de conclusão com assinaturas (pendente)
- [x] Adicionar seção de observações no PDF
- [x] Adicionar assinaturas no PDF
- [x] Testar fluxo completo


## Teste de Formulários de Checklist (Janeiro 2026)
- [x] Verificar que templates estão no banco de dados (5 templates confirmados)
- [x] Verificar que aba Inspeções aparece na página de detalhes da OS
- [x] Verificar que botão "Nova Tarefa" está visível
- [x] Testar criação de tarefa de inspeção
- [x] Verificar que botão "Adicionar Checklist" aparece
- [x] Verificar que dropdown mostra os 5 tipos de checklist
- [ ] Testar seleção de tipo de checklist (Gerador)
- [ ] Testar preenchimento de formulário dinâmico
- [ ] Testar salvamento de checklist preenchido
- [ ] Verificar que checklist aparece na tarefa
- [ ] Testar conclusão de tarefa com assinaturas

## Bug: Checklists não atualizam automaticamente (Urgente)
- [x] Adicionar invalidação de cache após adicionar checklist
- [x] Adicionar invalidação de cache após deletar checklist
- [x] Adicionar invalidação de cache após salvar respostas
- [x] Corrigir atualização automática - ADIÇÃO e DELEÇÃO funcionando
