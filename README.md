# 💰 FinanceTech — Gerenciador Financeiro Pessoal

O **FinanceTech** é uma aplicação web de gerenciamento financeiro pessoal, desenvolvida para auxiliar usuários no controle de receitas, despesas, metas financeiras e orçamentos mensais.

O sistema utiliza uma arquitetura **cliente-servidor**, com frontend em HTML, CSS e JavaScript, backend desenvolvido em C# com ASP.NET Core e banco de dados PostgreSQL.

A aplicação também possui recursos de **Progressive Web App (PWA)**, permitindo sua instalação em dispositivos móveis e computadores.

> 📌 **Projeto Acadêmico:** Práticas Extensionistas Integradoras 4 — Universidade de Vassouras.

---

## 🚀 Funcionalidades

### 📊 Dashboard Financeiro

- Visualização do saldo financeiro.
- Exibição do total de receitas e despesas.
- Cálculo automático do saldo: `Saldo = Receitas - Despesas`.
- Gráficos para análise das movimentações financeiras.
- Indicadores financeiros e acompanhamento da taxa de economia.
- Visualização das principais categorias de despesas.

### 💸 Gestão de Receitas e Despesas

- Cadastro de movimentações financeiras.
- Edição e exclusão de transações.
- Classificação por categorias.
- Registro de valores, datas e descrições.
- Atualização automática dos indicadores financeiros.

### 📋 Histórico Financeiro

- Consulta das movimentações cadastradas.
- Filtragem de transações.
- Organização do histórico financeiro.
- Exportação de dados em formato CSV.

### 🎯 Metas Financeiras

- Cadastro de metas financeiras.
- Definição de valores e objetivos.
- Acompanhamento do progresso das metas.
- Gerenciamento das metas cadastradas.

### 💰 Orçamentos Mensais

- Definição de limites de gastos por categoria.
- Acompanhamento dos valores utilizados.
- Comparação entre orçamento e despesas.
- Gerenciamento dos orçamentos mensais.

### 🔐 Autenticação e Usuários

- Cadastro de usuários.
- Login com e-mail e senha.
- Autenticação utilizando JSON Web Token (JWT).
- Proteção dos endpoints da API.
- Associação dos dados financeiros ao usuário autenticado.
- Armazenamento seguro das senhas por meio de hash.

### 💬 Sistema de Feedback

- Formulário para envio de sugestões, problemas e elogios.
- Associação dos feedbacks aos usuários autenticados.
- Armazenamento das mensagens no banco de dados PostgreSQL.
- Comunicação com a API para registrar os feedbacks.

### 📱 Progressive Web App (PWA)

- Interface responsiva para computadores, tablets e smartphones.
- Possibilidade de instalação na tela inicial.
- Utilização de Web App Manifest.
- Service Worker para gerenciamento de recursos em cache.
- Experiência de utilização semelhante à de um aplicativo.

**Observação:** o funcionamento offline depende dos recursos armazenados em cache. Operações que exigem comunicação com a API e o banco de dados remoto necessitam de conexão com a internet.

---

## 🛠️ Tecnologias Utilizadas

### Frontend

- **HTML5:** estrutura das páginas.
- **CSS3:** estilização e responsividade.
- **JavaScript:** funcionalidades e integração com a API.
- **Chart.js:** construção dos gráficos financeiros.

### Backend

- **C#:** linguagem de programação.
- **ASP.NET Core:** framework utilizado para desenvolver a API REST.
- **Entity Framework Core:** ORM responsável pelo mapeamento e persistência dos dados.
- **JWT:** autenticação e autorização dos usuários.

### Banco de Dados

- **PostgreSQL:** banco de dados relacional.
- **Supabase:** serviço de hospedagem do PostgreSQL.
- **Entity Framework Core Migrations:** gerenciamento das alterações na estrutura do banco.

### PWA

- **manifest.json:** configuração da identidade e instalação do aplicativo.
- **sw.js:** Service Worker utilizado para recursos de cache.
- **localStorage:** armazenamento local de informações de sessão e preferências necessárias ao frontend.

### Hospedagem e Versionamento

- **GitHub:** versionamento do código-fonte.
- **GitHub Pages:** hospedagem do frontend.
- **Render:** hospedagem da API ASP.NET Core.
- **Supabase:** hospedagem do banco de dados PostgreSQL.

---

## ☁️ Arquitetura do Sistema

O FinanceTech utiliza uma arquitetura cliente-servidor com seus principais componentes hospedados em serviços de nuvem.

```text
          USUÁRIO
             |
             v
       FRONTEND / PWA
      HTML, CSS e JS
        GitHub Pages
             |
         HTTPS / JSON
             |
             v
        API REST
      C# / ASP.NET Core
           Render
             |
      Entity Framework
             |
             v
         PostgreSQL
          Supabase
```

### Funcionamento

1. O usuário acessa o FinanceTech pelo navegador ou PWA instalado.
2. O frontend apresenta a interface e realiza requisições HTTP.
3. A API ASP.NET Core recebe e processa as requisições.
4. Os endpoints protegidos validam a autenticação JWT.
5. O Entity Framework Core realiza as operações no PostgreSQL.
6. A API retorna os dados em JSON.
7. O frontend atualiza os indicadores, gráficos e informações exibidas.

---

## 🗂️ Estrutura do Projeto

```text
FinanceTech/
│
├── index.html
├── style.css
├── app.js
├── manifest.json
├── sw.js
│
└── FinanceTechApi/
    │
    ├── Controllers/
    │   ├── AuthController.cs
    │   ├── TransacoesController.cs
    │   └── FeedbackController.cs
    │
    ├── Models/
    │   ├── Usuario.cs
    │   ├── Transacao.cs
    │   ├── MetaFinanceira.cs
    │   ├── OrcamentoMensal.cs
    │   └── Feedback.cs
    │
    ├── Data/
    │   └── AppDbContext.cs
    │
    ├── Migrations/
    ├── Program.cs
    └── appsettings.json
```

*Estrutura simplificada, apresentando os principais arquivos e componentes do projeto.*

---

## 🌐 Acesso ao Sistema

### Aplicação Web

https://felipe-casagrande.github.io/FinanceTech/

### API REST

https://financetech.onrender.com

### Repositório GitHub

https://github.com/felipe-casagrande/FinanceTech

---

## 📱 Instalação do PWA

1. Acesse o FinanceTech pelo navegador.
2. Abra o menu do navegador.
3. Selecione **Instalar aplicativo** ou **Adicionar à Tela de Início**, conforme o dispositivo.
4. Confirme a instalação.
5. Abra o FinanceTech pelo ícone criado.

A disponibilidade da opção de instalação depende do navegador e do dispositivo.

---

## 🔒 Segurança

O FinanceTech utiliza mecanismos de segurança para proteger o acesso aos dados dos usuários:

- Autenticação baseada em JWT.
- Senhas armazenadas por meio de hash.
- Endpoints protegidos por autenticação.
- Associação das informações financeiras ao usuário autenticado.
- Configurações sensíveis armazenadas em variáveis de ambiente no servidor.
- Comunicação entre frontend e backend por HTTPS.

As credenciais de acesso ao banco de dados e as chaves de autenticação não devem ser publicadas no repositório.

---

## 🎓 Objetivo Acadêmico

O FinanceTech foi desenvolvido no contexto da disciplina **Práticas Extensionistas Integradoras 4**, da Universidade de Vassouras.

O projeto busca aplicar conhecimentos de Engenharia de Software no desenvolvimento de uma solução para organização financeira pessoal.

Entre os conhecimentos aplicados estão:

- Engenharia de requisitos.
- Modelagem de sistemas e banco de dados.
- Desenvolvimento frontend e backend.
- Construção de APIs REST.
- Autenticação e autorização.
- Persistência de dados relacionais.
- Integração entre sistemas.
- Hospedagem em nuvem.
- Desenvolvimento de aplicações responsivas e PWA.
- Versionamento de código com Git e GitHub.

---

## 👥 Equipe do Projeto

- **Gerente do Projeto:** Felippe Pereira Miguel
- **Sub-gerente:** Felipe Casagrande Oliveira
- **Instituição:** Universidade de Vassouras

---

## 📌 Considerações Finais

O FinanceTech integra tecnologias de desenvolvimento web, backend e banco de dados para oferecer uma plataforma de controle financeiro pessoal.

Sua arquitetura permite a utilização do sistema em diferentes dispositivos, com armazenamento centralizado em banco de dados remoto, autenticação de usuários e recursos de acompanhamento financeiro.

O projeto também demonstra a aplicação prática de conceitos de Engenharia de Software, desde a definição dos requisitos até a implementação e publicação de uma aplicação full stack na nuvem.
