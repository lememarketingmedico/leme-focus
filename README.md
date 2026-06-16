# LEME Focus Simples

App Pomodoro clean, sem login, com modo claro/escuro e tempos personalizáveis.

## O que tem

- Timer Pomodoro, pausa curta e pausa longa
- Ajuste dos tempos direto no app
- Modo claro e modo escuro
- Tarefas simples
- Relatório básico do dia
- Pop-up interno ao finalizar o timer
- Alerta sonoro contínuo até iniciar o próximo ciclo
- Dados salvos no navegador via localStorage
- Layout responsivo
- Dockerfile pronto para EasyPanel

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
5. Faça o deploy.

## Observação

Essa versão não tem login e não usa banco de dados. Os dados ficam no navegador de cada dispositivo. O alerta sonoro toca dentro do navegador até o usuário iniciar o próximo ciclo.
