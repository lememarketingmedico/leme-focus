# LEME Focus

App de foco, tarefas e pomodoros com a identidade visual da LEME Marketing Médico.

## O que já tem

- Timer Pomodoro com foco, pausa curta e pausa longa
- Tarefas por cliente/projeto
- Estimativa e contagem de ciclos por tarefa
- Histórico de sessões concluídas
- Relatório do dia, da semana e por cliente
- Configurações de tempo
- Exportação e importação dos dados em JSON
- Layout responsivo para desktop e celular
- Dados salvos no navegador via localStorage

## Como rodar localmente

```bash
npm install
npm start
```

Acesse:

```bash
http://localhost:3000
```

## Como subir no EasyPanel

1. Crie um repositório no GitHub e envie estes arquivos.
2. No EasyPanel, clique em **Create App**.
3. Escolha **GitHub Repository** ou **Dockerfile**.
4. Selecione o repositório do LEME Focus.
5. Configure a porta interna como **3000**.
6. Faça o deploy.
7. Aponte um domínio, por exemplo: `focus.seudominio.com.br`.

## Observação importante

Esta é uma versão MVP sem login e sem banco de dados. Os dados ficam salvos no navegador de cada usuário. Para sincronizar entre computador e celular, a próxima versão deve incluir backend com login e PostgreSQL.
