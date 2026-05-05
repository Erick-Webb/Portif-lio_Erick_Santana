# Fitness Video Training - TODO

## Banco de Dados & Schema
- [x] Estender tabela users com campos: role (trainer/student), specialty, bio, avatarUrl, phone
- [x] Criar tabela trainer_profiles com especialidade e bio
- [x] Criar tabela sessions (sessões de treino agendadas)
- [x] Criar tabela session_history (histórico via status da tabela sessions)
- [x] Gerar migration SQL e aplicar no banco

## Backend (tRPC Routers)
- [x] Router: profiles (atualizar perfil, buscar perfil do trainer, listar trainers)
- [x] Router: sessions (criar, listar, cancelar, buscar por ID)
- [x] Router: history (listar histórico de treinos do aluno e do trainer)
- [x] Gerar roomName único por sessão para Jitsi Meet

## Frontend - Landing Page
- [x] Landing page elegante com hero section, features e CTA
- [x] Navegação com login e seleção de perfil

## Frontend - Autenticação & Perfil
- [x] Fluxo de onboarding: escolher papel (personal trainer ou aluno) após primeiro login
- [x] Página de configuração de perfil do personal trainer (nome, especialidade, bio, foto)
- [x] Página de configuração de perfil do aluno

## Frontend - Dashboard Personal Trainer
- [x] Dashboard com lista de alunos vinculados
- [x] Lista de sessões agendadas (próximas e passadas)
- [x] Botão para agendar nova sessão
- [x] Perfil do trainer editável (nome, especialidade, foto)
- [x] Acesso à sala de videoconferência Jitsi Meet por sessão

## Frontend - Dashboard Aluno
- [x] Dashboard com próximas sessões agendadas
- [x] Histórico de treinos realizados (data, trainer, duração)
- [x] Acesso à sala de videoconferência Jitsi Meet por sessão

## Frontend - Agendamento
- [x] Modal/página de agendamento com data, hora e duração
- [x] Seleção do aluno (pelo trainer) ou do trainer (pelo aluno)
- [x] Confirmação e exibição do link único da sessão

## Frontend - Sala de Videoconferência
- [x] Integração do Jitsi Meet via iframe/SDK
- [x] Sala dedicada por sessão com roomName único
- [x] Página de sala com informações da sessão (participantes, horário)

## Estilo Visual
- [x] Tema dark elegante com paleta premium (tons escuros + dourado)
- [x] Tipografia refinada (Playfair Display + Inter)
- [x] Componentes com glassmorphism e gradientes sutis
- [x] Animações de entrada suaves com framer-motion

## Testes
- [x] Testes unitários para routers de sessions e profiles
- [x] Testes de autenticação e autorização por role

## Novas Funcionalidades
- [x] Botão para trainer marcar sessão como concluída (endpoint sessions.complete + UI no dashboard)
- [x] Refatorar SessionRoom com sala real Jitsi Meet (meet.jit.si), deep link Android e iframe responsivo
- [x] Otimizar gerador de roomName para salas únicas e legíveis
- [x] Botão de acesso direto ao app Jitsi Meet no Android via deep link org.jitsi.meet://
- [x] Botão 'Copiar link da sala' com feedback visual e suporte a clipboard API + fallback
- [x] Tabela notifications no banco (userId, type, title, message, link, read, createdAt)
- [x] Endpoint tRPC: notifications.list, markRead e markAllRead
- [x] Disparar notificação ao aluno no backend ao criar sessão (sessions.create)
- [x] Componente NotificationBell no dashboard do aluno com badge de não lidas e painel dropdown
- [x] Jitsi Meet abre com câmera e microfone já ativos ao entrar na sala
- [ ] Seção QR Code na landing page com design premium e instruções de acesso mobile
