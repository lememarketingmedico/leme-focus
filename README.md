# LEME Focus Simples

App Pomodoro clean, sem login, com modo claro/escuro, tempos personalizáveis e alertas mais visíveis ao finalizar o timer.

## O que tem

- Timer Pomodoro, pausa curta e pausa longa
- Ajuste dos tempos direto no app
- Modo claro e modo escuro
- Tarefas simples
- Relatório básico do dia
- Pop-up grande dentro do app quando o timer termina
- Som mais perceptível ao finalizar
- Vibração em dispositivos compatíveis
- Título da aba piscando ao finalizar
- Notificação do navegador para aparecer mesmo usando outra aba ou outro app
- Dados salvos no navegador via localStorage
- Layout responsivo
- Dockerfile pronto para EasyPanel

## Importante sobre notificações

Para o alerta aparecer fora da aba, o usuário precisa clicar em **Alertas** ou **Ativar** e permitir as notificações do navegador.

As notificações do navegador funcionam em `localhost` e em sites com HTTPS. No EasyPanel, use domínio com SSL ativo.

Se a aba ou o navegador estiverem fechados, essa versão simples não mantém o timer rodando em segundo plano. Para isso, seria necessário transformar em PWA mais avançado ou usar backend/serviço dedicado.

## Como rodar localmente

```bash
npm install
npm start
```

Depois acesse:

```bash
http://localhost:3000
```

## Como subir no GitHub

```bash
git init
git add .
git commit -m "Adicionar LEME Focus Simples"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/leme-focus-simples.git
git push -u origin main
```

## Como subir no EasyPanel

1. Crie um app no EasyPanel.
2. Selecione o repositório do GitHub.
3. Escolha deploy por Dockerfile.
4. Configure a porta interna como `3000`.
5. Ative o domínio com SSL/HTTPS para as notificações funcionarem fora da aba.
6. Faça o deploy.

## Observação

Essa versão não tem login e não usa banco de dados. Os dados ficam no navegador de cada dispositivo.
