# LEME Focus

Versão clean do app de foco da LEME Marketing Médico.

## O que tem

- Timer de foco, pausa curta e pausa longa
- Tarefas por cliente/projeto
- Contagem de ciclos por tarefa
- Resumo do dia, da semana e por cliente
- Histórico de sessões
- Ajustes de tempo
- Exportação e importação dos dados em JSON
- Layout responsivo
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

## Observação

Esta versão não tem login nem banco de dados. Os dados ficam salvos no navegador. Para sincronizar entre computador e celular, a próxima etapa é criar login com PostgreSQL.
