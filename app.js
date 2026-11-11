
const API_BASE = 'https://financetech.onrender.com/api';
const API_URL = `${API_BASE}/transacoes`;
const AUTH_URL = `${API_BASE}/auth`;

let token = localStorage.getItem('financeToken');
let usuarioLogado = JSON.parse(localStorage.getItem('financeUsuario') || 'null');

let movimentacoes = [];

let myLineChart;
let myDoughnutDespesaChart;
let myDoughnutReceitaChart;


// ==============================
// AUTENTICAÇÃO
// ==============================

function mostrarFormularioAuth(tipo) {
  const login = document.getElementById('form-login');
  const cadastro = document.getElementById('form-cadastro');

  login.hidden = tipo !== 'login';
  cadastro.hidden = tipo !== 'cadastro';

  document.getElementById('btn-login-tab').classList.toggle('active', tipo === 'login');
  document.getElementById('btn-cadastro-tab').classList.toggle('active', tipo === 'cadastro');

  document.getElementById('auth-mensagem').innerText = '';
}


function mostrarAplicativo() {
  document.getElementById('tela-autenticacao').hidden = true;
  document.getElementById('app-container').hidden = false;

  document.getElementById('usuario-nome').innerText =
    `Olá, ${usuarioLogado.nome}`;

  buscarDadosNoBanco();
  window.carregarFinanceiroCarteiras?.();
}


function mostrarLogin() {
  document.getElementById('tela-autenticacao').hidden = false;
  document.getElementById('app-container').hidden = true;
}


async function autenticar(url, dados) {
  const mensagem = document.getElementById('auth-mensagem');

  mensagem.innerText = 'Aguarde...';

  try {
    const resposta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      mensagem.innerText =
        resultado.mensagem || resultado.message || 'Não foi possível realizar a operação.';
      return;
    }

    token = resultado.token;
    usuarioLogado = resultado.usuario;

    localStorage.setItem('financeToken', token);
    localStorage.setItem('financeUsuario', JSON.stringify(usuarioLogado));

    mensagem.innerText = '';

    mostrarAplicativo();

  } catch (erro) {
    console.error('Erro na autenticação:', erro);
    mensagem.innerText = 'Erro ao conectar com o servidor.';
  }
}


// Login
document.getElementById('form-login').addEventListener('submit', function(e) {
  e.preventDefault();

  autenticar(`${AUTH_URL}/login`, {
    email: document.getElementById('login-email').value,
    senha: document.getElementById('login-senha').value
  });
});


// Cadastro
document.getElementById('form-cadastro').addEventListener('submit', function(e) {
  e.preventDefault();

  autenticar(`${AUTH_URL}/cadastro`, {
    nome: document.getElementById('cadastro-nome').value,
    email: document.getElementById('cadastro-email').value,
    senha: document.getElementById('cadastro-senha').value
  });
});


// Sair da conta
function sairConta() {
  localStorage.removeItem('financeToken');
  localStorage.removeItem('financeUsuario');

  token = null;
  usuarioLogado = null;
  movimentacoes = [];
  window.invalidarSaldoConsolidado?.();

  if (myLineChart) myLineChart.destroy();
  if (myDoughnutDespesaChart) myDoughnutDespesaChart.destroy();
  if (myDoughnutReceitaChart) myDoughnutReceitaChart.destroy();

  mostrarLogin();
}


// ==============================
// NAVEGAÇÃO
// ==============================

function trocarTela(nomeTela) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('active'));

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const telaAlvo = document.getElementById(`tela-${nomeTela}`);

  if (telaAlvo) {
    telaAlvo.classList.add('active');
  }

  document.querySelectorAll('.nav-btn').forEach(botao => {
    if (botao.getAttribute('onclick')?.includes(`'${nomeTela}'`)) {
      botao.classList.add('active');
    }
  });

  atualizarDados();
  if (nomeTela === 'carteiras' || nomeTela === 'cofrinhos') window.carregarFinanceiroCarteiras?.(nomeTela);
  if (nomeTela === 'metas') carregarMetas();
  if (nomeTela === 'orcamentos') carregarOrcamentos();
  if (nomeTela === 'feedback') mensagemFeature('feedback-mensagem', '');
}


// ==============================
// BUSCAR TRANSAÇÕES
// ==============================

async function buscarDadosNoBanco() {
  if (!token) return;

  try {
    console.log('A contactar a API:', API_URL);

    const resposta = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (resposta.status === 401) {
      sairConta();
      return;
    }

    if (resposta.ok) {
      movimentacoes = await resposta.json();

      console.log('Dados recebidos:', movimentacoes);

      renderizarTela();
      window.carregarFinanceiroCarteiras?.();
      if (document.getElementById("tela-orcamentos")?.classList.contains("active")) carregarOrcamentos();

    } else {
      console.error('Erro ao buscar transações:', resposta.status);
    }

  } catch (erro) {
    console.error('Erro de conexão com a API:', erro);
  }
}


// ==============================
// FORMULÁRIOS DE RECEITA E DESPESA
// ==============================

const formReceita = document.getElementById('form-receita');
const formDespesa = document.getElementById('form-despesa');

if (formReceita) {
  formReceita.addEventListener('submit', salvarMovimentacao);
}

if (formDespesa) {
  formDespesa.addEventListener('submit', salvarMovimentacao);
}


async function salvarMovimentacao(e) {
  e.preventDefault();

  const formulario = e.currentTarget;

  // Impede novos envios enquanto a requisição anterior não terminar.
  if (formulario.dataset.salvando === 'true') {
    return;
  }

  formulario.dataset.salvando = 'true';

  const botoesSubmit = formulario.querySelectorAll('button[type="submit"]');
  const estadoBotoes = Array.from(botoesSubmit).map(botao => ({
    botao,
    disabled: botao.disabled,
    texto: botao.innerHTML
  }));

  botoesSubmit.forEach(botao => {
    botao.disabled = true;
    botao.setAttribute('aria-busy', 'true');
    botao.innerHTML = 'Salvando...';
  });

  try {
    const formId = formulario.id;
    const isReceita = formId === 'form-receita';
    const prefixo = isReceita ? 'rec' : 'desp';

    const valorInput = document.getElementById(`${prefixo}-valor`);
    const valor = parseFloat(valorInput ? valorInput.value : 0);

    if (valor <= 0 || Number.isNaN(valor)) {
      alert('O valor deve ser maior que zero.');
      return;
    }

    const idInput = document.getElementById(`${prefixo}-id`);
    const id = idInput ? idInput.value : '';

    const dados = {
      tipo: isReceita ? 'Receita' : 'Despesa',
      valor: valor,
      data: document.getElementById(`${prefixo}-data`).value,
      categoria: document.getElementById(`${prefixo}-categoria`).value,
      descricao: document.getElementById(`${prefixo}-desc`).value || 'Sem descrição',
      carteiraId: Number(document.getElementById(`${prefixo}-carteira`)?.value || 0)
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    let resposta;

    if (id) {
      dados.id = parseInt(id);

      resposta = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(dados)
      });
    } else {
      resposta = await fetch(API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(dados)
      });
    }

    if (resposta.status === 401) {
      sairConta();
      return;
    }

    if (!resposta.ok) {
      const erroDetalhado = await resposta.text();
      console.error('Erro ao salvar:', erroDetalhado);
      alert(`Não foi possível salvar. Status: ${resposta.status}. Erro: ${erroDetalhado}`);
      return;
    }

    formulario.reset();
    window.carregarFinanceiroCarteiras?.();

    if (idInput) {
      idInput.value = '';
    }

    trocarTela('dashboard');
    await buscarDadosNoBanco();

  } catch (erro) {
    console.error('Erro de rede ao salvar:', erro);
    alert('Erro de conexão. Aguarde alguns segundos e tente novamente.');
  } finally {
    // Libera o formulário somente quando a operação realmente terminar.
    formulario.dataset.salvando = 'false';

    estadoBotoes.forEach(({ botao, disabled, texto }) => {
      botao.disabled = disabled;
      botao.removeAttribute('aria-busy');
      botao.innerHTML = texto;
    });
  }
}

// ==============================
// EXCLUIR TRANSAÇÃO
// ==============================

async function excluirMovimentacao(id) {
  if (confirm('Tem certeza que deseja excluir?')) {
    try {
      const resposta = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (resposta.status === 401) {
        sairConta();
        return;
      }

      if (!resposta.ok) {
        alert('Não foi possível excluir a movimentação.');
        return;
      }

      buscarDadosNoBanco();

    } catch (erro) {
      console.error('Erro ao excluir:', erro);
    }
  }
}


// ==============================
// EDITAR TRANSAÇÃO
// ==============================

function editarMovimentacao(id) {
  const m = movimentacoes.find(item => item.id === id || item.Id === id);

  if (!m) return;

  const tipoReal = m.tipo || m.Tipo;

  const prefixo = tipoReal === 'Receita' ? 'rec' : 'desp';

  const idEl = document.getElementById(`${prefixo}-id`);
  const valEl = document.getElementById(`${prefixo}-valor`);
  const dataEl = document.getElementById(`${prefixo}-data`);
  const catEl = document.getElementById(`${prefixo}-categoria`);
  const descEl = document.getElementById(`${prefixo}-desc`);

  if (idEl) idEl.value = m.id || m.Id;
  if (valEl) valEl.value = m.valor || m.Valor;

  const dataReal = m.data || m.Data || '';

  const dataFormatada = dataReal.includes('T')
    ? dataReal.split('T')[0]
    : dataReal;

  if (dataEl) dataEl.value = dataFormatada;
  if (catEl) catEl.value = m.categoria || m.Categoria;
  if (descEl) descEl.value = m.descricao || m.Descricao;
  const carteiraEl = document.getElementById(`${prefixo}-carteira`);
  if (carteiraEl) carteiraEl.value = String(m.carteiraId ?? m.CarteiraId ?? '');

  trocarTela(tipoReal.toLowerCase());
}


// ==============================
// ATUALIZAR DADOS
// ==============================

function atualizarDados() {
  if (!token) return;

  renderizarTela();
}


// ==============================
// FILTROS GERAIS DO DASHBOARD
// ==============================

function formatarDataInput(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function alterarPeriodo() {
  const periodo = document.getElementById('filtro-periodo').value;
  const inicioEl = document.getElementById('filtro-data-inicio');
  const fimEl = document.getElementById('filtro-data-fim');
  const campoInicio = document.getElementById('campo-data-inicio');
  const campoFim = document.getElementById('campo-data-fim');

  campoInicio.hidden = periodo !== 'personalizado';
  campoFim.hidden = periodo !== 'personalizado';

  if (periodo === 'personalizado') {
    atualizarDados();
    return;
  }

  if (periodo === 'todos') {
    inicioEl.value = '';
    fimEl.value = '';
  } else {
    const hoje = new Date();
    const inicio = new Date(hoje);

    if (periodo === 'ano') {
      inicio.setMonth(0, 1);
    } else {
      inicio.setDate(inicio.getDate() - (Number(periodo) - 1));
    }

    inicioEl.value = formatarDataInput(inicio);
    fimEl.value = formatarDataInput(hoje);
  }

  atualizarDados();
}

function limparFiltros() {
  document.getElementById('filtro-periodo').value = 'todos';
  document.getElementById('filtro-categoria').value = 'TODAS';
  document.getElementById('filtro-carteira').value = 'TODAS';
  document.getElementById('filtro-data-inicio').value = '';
  document.getElementById('filtro-data-fim').value = '';
  document.getElementById('campo-data-inicio').hidden = true;
  document.getElementById('campo-data-fim').hidden = true;
  atualizarDados();
}

function atualizarCategoriasFiltro() {
  const select = document.getElementById('filtro-categoria');
  if (!select) return;

  const categoriaAtual = select.value || 'TODAS';
  const categorias = [...new Set(movimentacoes.map(m =>
    m.categoria || m.Categoria || ''
  ).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  select.innerHTML = '<option value="TODAS">Todas as categorias</option>';

  categorias.forEach(categoria => {
    const option = document.createElement('option');
    option.value = categoria;
    option.textContent = categoria;
    select.appendChild(option);
  });

  select.value = categorias.includes(categoriaAtual) ? categoriaAtual : 'TODAS';
}

// O filtro de carteira é independente do período e da categoria.
// As opções são fornecidas pela mesma API que alimenta os saldos.
function atualizarCarteirasFiltro(carteiras) {
  const select = document.getElementById('filtro-carteira');
  if (!select) return;
  const anterior = select.value;
  const lista = Array.isArray(carteiras) ? carteiras : [];
  select.replaceChildren(new Option('Todas as carteiras', 'TODAS'));
  lista.filter(c => !c.arquivada).forEach(c => {
    select.add(new Option(c.nome, String(c.id)));
  });
  select.value = [...select.options].some(o => o.value === anterior) ? anterior : 'TODAS';
  atualizarDados();
}

function obterMovimentacoesFiltradas() {
  const filtroCat = document.getElementById('filtro-categoria')?.value || 'TODAS';
  const filtroCarteira = document.getElementById('filtro-carteira')?.value || 'TODAS';
  const dataInicio = document.getElementById('filtro-data-inicio')?.value || '';
  const dataFim = document.getElementById('filtro-data-fim')?.value || '';

  return movimentacoes.filter(m => {
    const dataReal = m.data || m.Data || '';
    const categoriaReal = m.categoria || m.Categoria || '';
    const dataTransacao = dataReal.includes('T') ? dataReal.split('T')[0] : dataReal;

    const passaInicio = !dataInicio || dataTransacao >= dataInicio;
    const passaFim = !dataFim || dataTransacao <= dataFim;
    const passaCategoria = filtroCat === 'TODAS' || categoriaReal === filtroCat;
    const idCarteira = m.carteiraId ?? m.CarteiraId;
    const passaCarteira = filtroCarteira === 'TODAS' || String(idCarteira ?? '') === filtroCarteira;

    return passaInicio && passaFim && passaCategoria && passaCarteira;
  });
}

// FILTROS INDEPENDENTES DO HISTÓRICO
function atualizarCategoriasHistorico() {
  const select = document.getElementById('historico-categoria');
  if (!select) return;
  const anterior = select.value;
  const categorias = [...new Set(movimentacoes.map(m => m.categoria || m.Categoria).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'));
  select.replaceChildren(new Option('Todas as categorias', 'TODAS'));
  categorias.forEach(cat => select.add(new Option(cat, cat)));
  select.value = categorias.includes(anterior) ? anterior : 'TODAS';
}

function alterarPeriodoHistorico() {
  const periodo = document.getElementById('historico-periodo').value;
  document.querySelectorAll('.history-custom-date').forEach(el => el.hidden = periodo !== 'personalizado');
  const inicio = document.getElementById('historico-inicio');
  const fim = document.getElementById('historico-fim');
  if (periodo === 'todos') { inicio.value = ''; fim.value = ''; }
  else if (periodo !== 'personalizado') {
    const hoje = new Date();
    const primeira = new Date(hoje);
    if (periodo === 'ano') primeira.setMonth(0,1);
    else primeira.setDate(primeira.getDate() - Number(periodo) + 1);
    inicio.value = formatarDataInput(primeira);
    fim.value = formatarDataInput(hoje);
  }
  renderizarHistorico();
}

function limparFiltrosHistorico() {
  document.getElementById('historico-busca').value = '';
  document.getElementById('historico-tipo').value = 'TODOS';
  document.getElementById('historico-categoria').value = 'TODAS';
  document.getElementById('historico-periodo').value = 'todos';
  document.getElementById('historico-inicio').value = '';
  document.getElementById('historico-fim').value = '';
  document.querySelectorAll('.history-custom-date').forEach(el => el.hidden = true);
  renderizarHistorico();
}

function renderizarHistorico() {
  const tbody = document.getElementById('tabela-historico');
  if (!tbody) return;
  const busca = (document.getElementById('historico-busca')?.value || '').trim().toLocaleLowerCase('pt-BR');
  const tipo = document.getElementById('historico-tipo')?.value || 'TODOS';
  const categoria = document.getElementById('historico-categoria')?.value || 'TODAS';
  const inicio = document.getElementById('historico-inicio')?.value || '';
  const fim = document.getElementById('historico-fim')?.value || '';
  const lista = movimentacoes.filter(m => {
    const data = String(m.data || m.Data || '').slice(0,10);
    const cat = m.categoria || m.Categoria || '';
    const desc = m.descricao || m.Descricao || '';
    const t = m.tipo || m.Tipo || '';
    return (tipo === 'TODOS' || t === tipo) && (categoria === 'TODAS' || cat === categoria)
      && (!inicio || data >= inicio) && (!fim || data <= fim)
      && (!busca || `${desc} ${cat}`.toLocaleLowerCase('pt-BR').includes(busca));
  }).sort((a,b) => String(b.data || b.Data || '').localeCompare(String(a.data || a.Data || '')));
  tbody.replaceChildren();
  const resumo = document.getElementById('historico-resumo');
  if (resumo) resumo.textContent = `${lista.length} movimentação(ões) encontrada(s)`;
  if (!lista.length) {
    const linha = tbody.insertRow(); const celula = linha.insertCell(); celula.colSpan = 6;
    celula.textContent = 'Nenhuma movimentação encontrada para estes filtros.';
    celula.className = 'history-empty';
  }
  lista.forEach(m => {
    const linha = tbody.insertRow();
    const data = String(m.data || m.Data || '').slice(0,10);
    const tipoReal = m.tipo || m.Tipo || '';
    const valor = Number(m.valor ?? m.Valor ?? 0);
    [data ? data.split('-').reverse().join('/') : '', tipoReal,
      m.categoria || m.Categoria || 'Sem categoria', m.descricao || m.Descricao || '-',
      valor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})].forEach((valorCelula,i) => {
      const td = linha.insertCell(); td.textContent = valorCelula;
      if (i === 1) td.className = tipoReal === 'Receita' ? 'tipo-receita' : 'tipo-despesa';
    });
    const acoes = linha.insertCell();
    const id = Number(m.id ?? m.Id);
    if (Number.isSafeInteger(id) && id > 0) {
      const editar = document.createElement('button'); editar.type = 'button';
      editar.className = 'btn btn-sm btn-edit'; editar.textContent = 'Editar';
      editar.addEventListener('click', () => editarMovimentacao(id));
      const excluir = document.createElement('button'); excluir.type = 'button';
      excluir.className = 'btn btn-sm btn-delete'; excluir.textContent = 'Excluir';
      excluir.addEventListener('click', () => excluirMovimentacao(id));
      acoes.append(editar, document.createTextNode(' '), excluir);
    }
  });
}

// Saldos consolidados, atualizados exclusivamente pelos dados da API de carteiras.
let carteirasDashboard = null;
function atualizarSaldosDashboard() {
  const total = document.getElementById('dash-saldo');
  const disponivel = document.getElementById('dash-disponivel');
  const reservado = document.getElementById('dash-reservado');
  const formatar = valor => Number(valor).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
  const carteiraId = document.getElementById('filtro-carteira')?.value || 'TODAS';
  if (!carteirasDashboard) {
    if (total) total.textContent = '—';
    if (disponivel) disponivel.textContent = '—';
    if (reservado) reservado.textContent = '—';
    return;
  }
  const selecionadas = carteirasDashboard.filter(c => !c.arquivada &&
    (carteiraId === 'TODAS' || String(c.id) === carteiraId));
  const somar = campo => selecionadas.reduce((s,c) => s + Number(c[campo] ?? 0), 0);
  if (total) total.textContent = formatar(somar('saldoAtual'));
  if (disponivel) disponivel.textContent = formatar(somar('saldoDisponivel'));
  if (reservado) reservado.textContent = formatar(somar('saldoReservado'));
}
window.atualizarSaldoConsolidado = function(carteiras) {
  carteirasDashboard = Array.isArray(carteiras) ? carteiras : [];
  atualizarCarteirasFiltro(carteirasDashboard);
  atualizarSaldosDashboard();
};
window.invalidarSaldoConsolidado = function() {
  carteirasDashboard = null;
  atualizarSaldosDashboard();
};

// ==============================
// RENDERIZAR DASHBOARD E HISTÓRICO
// ==============================

function renderizarTela() {
  atualizarCategoriasFiltro();
  atualizarCategoriasHistorico();

  let recTotal = 0;
  let despTotal = 0;
  const despesasPorCategoria = {};
  const receitasPorCategoria = {};
  const evolucaoTempo = {};
  const todasDespesas = [];

  const tbodyRecente = document.getElementById('dash-tabela-recente');
  const movFiltradas = obterMovimentacoesFiltradas();

  if (tbodyRecente) tbodyRecente.innerHTML = '';

  movFiltradas.forEach(m => {
    const dataReal = m.data || m.Data || '';
    const tipoReal = m.tipo || m.Tipo;
    const valorReal = Number(m.valor ?? m.Valor ?? 0);
    const categoriaReal = m.categoria || m.Categoria || 'Sem categoria';
    const descReal = m.descricao || m.Descricao || '-';
    const idReal = m.id || m.Id;
    const dataSimples = dataReal.includes('T') ? dataReal.split('T')[0] : dataReal;

    if (!evolucaoTempo[dataSimples]) {
      evolucaoTempo[dataSimples] = { rec: 0, desp: 0 };
    }

    if (tipoReal === 'Receita') {
      recTotal += valorReal;
      receitasPorCategoria[categoriaReal] = (receitasPorCategoria[categoriaReal] || 0) + valorReal;
      evolucaoTempo[dataSimples].rec += valorReal;
    }

    if (tipoReal === 'Despesa') {
      despTotal += valorReal;
      despesasPorCategoria[categoriaReal] = (despesasPorCategoria[categoriaReal] || 0) + valorReal;
      evolucaoTempo[dataSimples].desp += valorReal;
      todasDespesas.push(m);
    }


  });

  // Movimentações recentes dentro do período e da categoria selecionados
  const ultimos = [...movFiltradas].sort((a, b) =>
    new Date(b.data || b.Data) - new Date(a.data || a.Data)
  ).slice(0, 5);

  ultimos.forEach(m => {
    if (!tbodyRecente) return;

    const dataReal = m.data || m.Data || '';
    const tipoReal = m.tipo || m.Tipo;
    const valorReal = Number(m.valor ?? m.Valor ?? 0);
    const categoriaReal = m.categoria || m.Categoria || 'Sem categoria';
    const descReal = m.descricao || m.Descricao || '-';
    const dataSimples = dataReal.includes('T') ? dataReal.split('T')[0] : dataReal;
    const dataPtBR = dataSimples ? dataSimples.split('-').reverse().join('/') : '';
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${dataPtBR}</td>
      <td class="${tipoReal === 'Receita' ? 'tipo-receita' : 'tipo-despesa'}">${tipoReal}</td>
      <td>${categoriaReal}</td>
      <td>${descReal}</td>
      <td>R$ ${valorReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
    `;
    tbodyRecente.appendChild(row);
  });

  const saldo = recTotal - despTotal;
  // Saldo real vem de /api/carteiras (inclui saldo inicial, transferências e reservas).
  // Não sobrescrever com o resultado filtrado de receitas - despesas.
  atualizarSaldosDashboard();
  document.getElementById('dash-receita').innerText = `R$ ${recTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  document.getElementById('dash-despesa').innerText = `R$ ${despTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  todasDespesas.sort((a, b) => Number(b.valor ?? b.Valor ?? 0) - Number(a.valor ?? a.Valor ?? 0));
  const categoriasOrdenadas = Object.entries(despesasPorCategoria).sort((a, b) => b[1] - a[1]).slice(0, 7);

  // Agrupa os valores por mês para facilitar a comparação
  const porMes = {};
  Object.keys(evolucaoTempo).sort().forEach(data => {
    if (!data) return;
    const mes = data.substring(0, 7);
    if (!porMes[mes]) porMes[mes] = { rec: 0, desp: 0 };
    porMes[mes].rec += evolucaoTempo[data].rec;
    porMes[mes].desp += evolucaoTempo[data].desp;
  });

  const mesesOrdenados = Object.keys(porMes).sort();
  const linhaLabels = mesesOrdenados.map(mes => {
    const [ano, numeroMes] = mes.split('-');
    return `${numeroMes}/${ano}`;
  });
  const linhaSaldo = [];
  const receitasMensais = [];
  const despesasMensais = [];
  let saldoAcumulado = 0;

  mesesOrdenados.forEach(mes => {
    const valores = porMes[mes];
    saldoAcumulado += valores.rec - valores.desp;
    linhaSaldo.push(saldoAcumulado);
    receitasMensais.push(valores.rec);
    despesasMensais.push(valores.desp);
  });

  const categoriaSelecionada = document.getElementById('filtro-categoria')?.value || 'TODAS';
  const carteiraSelecionada = document.getElementById('filtro-carteira');
  const dataInicio = document.getElementById('filtro-data-inicio')?.value;
  const dataFim = document.getElementById('filtro-data-fim')?.value;
  let resumo = `${movFiltradas.length} movimentação(ões) encontrada(s)`;
  if (categoriaSelecionada !== 'TODAS') resumo += ` • ${categoriaSelecionada}`;
  if (carteiraSelecionada?.value !== 'TODAS') resumo += ` • Carteira: ${carteiraSelecionada.selectedOptions[0]?.textContent || 'selecionada'}`;
  if (dataInicio || dataFim) resumo += ` • ${dataInicio ? dataInicio.split('-').reverse().join('/') : 'Início'} até ${dataFim ? dataFim.split('-').reverse().join('/') : 'hoje'}`;
  document.getElementById('filtro-resumo').textContent = resumo;

  const datasOrdenadas = Object.keys(evolucaoTempo).filter(Boolean).sort();
  const diario = [];
  if (datasOrdenadas.length) {
    // Inclui os dias sem lançamentos: a linha representa a evolução real do saldo.
    const inicio = new Date(`${datasOrdenadas[0]}T12:00:00`);
    const fim = new Date(`${datasOrdenadas[datasOrdenadas.length - 1]}T12:00:00`);
    let saldoCorrente = 0;
    for (let dia = new Date(inicio); dia <= fim; dia.setDate(dia.getDate() + 1)) {
      const chave = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
      const mov = evolucaoTempo[chave] || { rec: 0, desp: 0 };
      saldoCorrente += mov.rec - mov.desp;
      diario.push({ data: chave, saldo: saldoCorrente });
    }
  }
  // Para intervalos longos, mostra o último saldo de cada mês para manter a leitura.
  const serieEvolucao = diario.length > 110
    ? Object.values(diario.reduce((acc, ponto) => {
        acc[ponto.data.slice(0, 7)] = ponto;
        return acc;
      }, {}))
    : diario;

  renderizarHistorico();

  atualizarGraficos({
    recTotal, despTotal, despesasPorCategoria, receitasPorCategoria,
    categoriasOrdenadas, linhaLabels, linhaSaldo, receitasMensais, despesasMensais,
    evolucaoLabels: serieEvolucao.map(p => p.data.slice(8, 10) + '/' + p.data.slice(5, 7) + (diario.length > 110 ? '/' + p.data.slice(2, 4) : '')),
    evolucaoValores: serieEvolucao.map(p => p.saldo)
  });
}


// ==============================
// GRÁFICOS
// ==============================

function atualizarGraficos(dados) {
  const BRL = valor => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const compacta = valor => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(valor);
  const verde = '#38bdf8';
  const turquesa = '#22d3ee';
  const coral = '#fb7185';
  const paleta = ['#38bdf8', '#a78bfa', '#f59e0b', '#2dd4bf', '#fb7185', '#818cf8', '#84cc16', '#f472b6', '#60a5fa', '#f97316', '#22d3ee', '#c084fc'];
  const grade = 'rgba(134, 170, 218, .12)';
  const texto = '#9fb7d8';

  Chart.defaults.color = texto;
  Chart.defaults.font.family = 'Inter, sans-serif';
  Chart.defaults.font.size = 11;
  [myLineChart, myDoughnutDespesaChart, myDoughnutReceitaChart]
    .forEach(g => { if (g) g.destroy(); });

  const tooltip = {
    backgroundColor: '#0b1b35', titleColor: '#f2f8ff', bodyColor: '#c6d9f2',
    borderColor: 'rgba(56,189,248,.28)', borderWidth: 1,
    padding: 13, cornerRadius: 11, displayColors: true,
    callbacks: { label: ctx => `${ctx.dataset.label || ctx.label}: ${BRL(ctx.parsed?.y ?? ctx.parsed?.x ?? ctx.raw)}` }
  };
  const base = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    animation: { duration: 850, easing: 'easeOutQuart' },
    plugins: { legend: { labels: { color: '#b9cde8', usePointStyle: true, pointStyle: 'circle', padding: 20 } }, tooltip }
  };
  const eixoX = { grid: { display: false }, border: { display: false }, ticks: { color: texto, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } };
  const eixoY = { grid: { color: grade, drawTicks: false }, border: { display: false, dash: [4, 5] }, ticks: { color: texto, padding: 12, callback: compacta } };

  const linha = document.getElementById('lineChart');
  if (linha) {
    const ctx = linha.getContext('2d');
    const preenchimento = ctx.createLinearGradient(0, 0, 0, 430);
    preenchimento.addColorStop(0, 'rgba(56,189,248,.34)');
    preenchimento.addColorStop(.45, 'rgba(56,189,248,.12)');
    preenchimento.addColorStop(1, 'rgba(56,189,248,0)');
    myLineChart = new Chart(ctx, {
      type: 'line',
      data: { labels: dados.evolucaoLabels, datasets: [{
        label: 'Saldo no período', data: dados.evolucaoValores,
        borderColor: verde, backgroundColor: preenchimento,
        fill: 'origin', tension: .38, cubicInterpolationMode: 'monotone',
        borderWidth: 3, pointRadius: 0, pointHitRadius: 18,
        pointHoverRadius: 6, pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: '#091b36', pointHoverBorderColor: verde
      }] },
      options: {
        ...base,
        plugins: { ...base.plugins, legend: { display: false },
          tooltip: { ...tooltip, callbacks: { label: c => `Saldo: ${BRL(c.parsed.y)}` } } },
        scales: { x: eixoX, y: eixoY }
      }
    });
  }

  // Painéis informativos substituem os dois gráficos antigos.
  const painel = document.getElementById('resumo-financeiro-visual');
  if (painel) {
    const total = dados.recTotal + dados.despTotal;
    const pct = total ? dados.recTotal / total * 100 : 50;
    const saldo = dados.recTotal - dados.despTotal;
    painel.innerHTML = `<div class="insight-balance"><span>Resultado do período</span><strong class="${saldo < 0 ? 'negative' : ''}">${BRL(saldo)}</strong></div>
      <div class="split-track"><div style="width:${pct}%"></div></div>
      <div class="split-labels"><span>● Receitas <b>${BRL(dados.recTotal)}</b></span><span>● Despesas <b>${BRL(dados.despTotal)}</b></span></div>
      <p class="insight-note">${dados.recTotal ? `Você utilizou ${(dados.despTotal / dados.recTotal * 100).toFixed(1).replace('.', ',')}% das receitas em despesas.` : 'Cadastre receitas para acompanhar o comprometimento da renda.'}</p>`;
  }
  const insights = document.getElementById('insights-gastos');
  if (insights) {
    const cats = dados.categoriasOrdenadas;
    const maior = cats[0];
    const media = dados.despTotal / Math.max(1, dados.despesasMensais.filter(x => x > 0).length);
    insights.innerHTML = `<div class="insight-stat"><span>Categoria com maior gasto</span><strong>${maior ? escaparHtml(maior[0]) : 'Sem despesas'}</strong><small>${maior ? BRL(maior[1]) : 'Nenhuma despesa no período'}</small></div>
      <div class="insight-stat"><span>Média mensal de despesas*</span><strong>${BRL(media)}</strong></div>
      <div class="insight-stat"><span>Categorias com gastos</span><strong>${cats.length}</strong></div>
      <p class="insight-note">*Média calculada sobre os meses com despesas registradas no período selecionado.</p>`;
  }

  function rosca(id, mapa, detalhesId) {
    const el = document.getElementById(id);
    if (!el) return null;
    const entradas = Object.entries(mapa).filter(([, valor]) => Number(valor) > 0).sort((a, b) => b[1] - a[1]);
    const total = entradas.reduce((acc, [, valor]) => acc + Number(valor), 0);
    const cores = entradas.map((_, i) => paleta[i % paleta.length]);
    const detalhe = document.getElementById(detalhesId);
    if (detalhe) {
      if (!entradas.length) {
        detalhe.innerHTML = '<p class="category-empty">Nenhuma movimentação nessa seleção.</p>';
      } else {
        detalhe.innerHTML = `<div class="category-breakdown-heading"><span>Categoria</span><span>Participação · Valor</span></div>` + entradas.map(([nome, valor], i) => {
          const pct = total ? valor / total * 100 : 0;
          return `<div class="category-item"><div class="category-item-top"><span class="category-name"><i class="category-dot" style="background:${cores[i]}"></i>${escaparHtml(nome)}</span><span class="category-amount"><b>${pct.toFixed(1).replace('.', ',')}%</b> · ${BRL(valor)}</span></div><div class="category-track"><span style="width:${pct}%;background:${cores[i]}"></span></div></div>`;
        }).join('');
      }
    }
    const centro = {
      id: 'fintechCentro', afterDraw(chart) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const x = (chartArea.left + chartArea.right) / 2;
        const y = (chartArea.top + chartArea.bottom) / 2;
        ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#9bb4d7'; ctx.font = '500 12px Inter, sans-serif';
        ctx.fillText('TOTAL', x, y - 14);
        ctx.fillStyle = '#eff7ff'; ctx.font = '700 22px Inter, sans-serif';
        ctx.fillText(compacta(total), x, y + 14);
        ctx.restore();
      }
    };
    return new Chart(el.getContext('2d'), {
      type: 'doughnut',
      data: { labels: entradas.length ? entradas.map(([nome]) => nome) : ['Sem dados'],
        datasets: [{ data: entradas.length ? entradas.map(([, valor]) => valor) : [1],
          backgroundColor: entradas.length ? cores : ['#172b48'],
          borderColor: '#101e35', borderWidth: 4, borderRadius: 5, spacing: 2, hoverOffset: 12 }] },
      plugins: [centro],
      options: { ...base, cutout: '73%',
        plugins: { ...base.plugins,
          legend: { display: false },
          tooltip: { ...tooltip, callbacks: { label: c => entradas.length ? `${c.label}: ${BRL(c.raw)} (${(c.raw / total * 100).toFixed(1).replace('.', ',')}%)` : 'Sem dados' } }
        }
      }
    });
  }
  myDoughnutDespesaChart = rosca('doughnutDespesaChart', dados.despesasPorCategoria, 'detalhes-despesas');
  myDoughnutReceitaChart = rosca('doughnutReceitaChart', dados.receitasPorCategoria, 'detalhes-receitas');

  const taxa = document.getElementById('dash-economia');
  if (taxa) {
    const percentual = dados.recTotal > 0 ? ((dados.recTotal - dados.despTotal) / dados.recTotal) * 100 : null;
    taxa.textContent = percentual === null ? '—' : `${percentual.toFixed(1).replace('.', ',')}%`;
    taxa.classList.toggle('negative', percentual !== null && percentual < 0);
  }
  const heroValor = document.getElementById('hero-saldo');
  if (heroValor) heroValor.textContent = BRL(dados.recTotal - dados.despTotal);
  const heroMov = document.getElementById('hero-movimentos');
  if (heroMov) heroMov.textContent = `${dados.evolucaoLabels.length} pontos no gráfico`;
}


// ==============================
// METAS, ORÇAMENTOS E EXPORTAÇÃO
// ==============================
const API_METAS = `${API_BASE}/metas`;
const API_ORCAMENTOS = `${API_BASE}/orcamentos`;
const BRL_UI = valor => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
function escaparHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
async function requisicaoFinanceira(url, options = {}) {
  const resposta = await fetch(url, {
    ...options,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (resposta.status === 401) { sairConta(); throw new Error('Sessão expirada. Faça login novamente.'); }
  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(corpo.length < 180 ? corpo : `Erro HTTP ${resposta.status}`);
  }
  return resposta.status === 204 ? null : resposta.json();
}
function mensagemFeature(id, texto) { const el = document.getElementById(id); if (el) el.textContent = texto; }
async function carregarMetas() {
  const lista = document.getElementById('lista-metas');
  if (!lista || !token) return;
  try {
    const metas = await requisicaoFinanceira(API_METAS);
    lista.innerHTML = metas.length ? metas.map(m => {
      const progresso = m.valorAlvo > 0 ? Math.min(100, m.valorAtual / m.valorAlvo * 100) : 0;
      return `<article class="widget-card feature-item"><div class="feature-item-header"><div><h3>${escaparHtml(m.nome)}</h3><p>${m.prazo ? `Prazo: ${escaparHtml(m.prazo.slice(0,10).split('-').reverse().join('/'))}` : 'Sem prazo definido'}</p></div><button class="feature-danger" onclick="excluirMeta(${m.id})">Excluir</button></div>
      <div class="feature-values"><strong>${BRL_UI(m.valorAtual)}</strong><span>de ${BRL_UI(m.valorAlvo)} • ${progresso.toFixed(0)}%</span></div><div class="feature-progress"><span style="width:${progresso}%"></span></div>
      <form class="feature-contrib" onsubmit="adicionarValorMeta(event,${m.id})"><label>Adicionar valor à meta (R$)<input type="number" min="0.01" step="0.01" required name="valor"></label><button type="submit" class="feature-primary">Adicionar</button></form></article>`;
    }).join('') : '<p class="feature-empty">Você ainda não cadastrou metas.</p>';
  } catch (e) { lista.textContent = `Não foi possível carregar as metas: ${e.message}`; }
}
async function adicionarValorMeta(event, id) {
  event.preventDefault(); const form = event.currentTarget;
  if (form.dataset.sending === 'true') return;
  form.dataset.sending = 'true'; const btn = form.querySelector('button'); btn.disabled = true;
  try { await requisicaoFinanceira(`${API_METAS}/${id}/aportes`, { method: 'POST', body: JSON.stringify({ valor: Number(form.elements.valor.value) }) }); await carregarMetas(); }
  catch(e) { alert(e.message); } finally { form.dataset.sending = 'false'; btn.disabled = false; }
}
async function excluirMeta(id) {
  if (!confirm('Excluir esta meta?')) return;
  try { await requisicaoFinanceira(`${API_METAS}/${id}`, { method:'DELETE' }); await carregarMetas(); }
  catch(e) { alert(e.message); }
}
document.getElementById('form-meta')?.addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget;
  if (form.dataset.sending === 'true') return;
  form.dataset.sending = 'true'; const btn = form.querySelector('button'); btn.disabled = true;
  try {
    await requisicaoFinanceira(API_METAS, { method:'POST', body: JSON.stringify({ nome: form.elements.nome.value.trim(), valorAlvo: Number(form.elements.valorAlvo.value), prazo: form.elements.prazo.value || null }) });
    form.reset(); mensagemFeature('meta-mensagem', 'Meta criada com sucesso!'); await carregarMetas();
  } catch(e) { mensagemFeature('meta-mensagem', e.message); }
  finally { form.dataset.sending = 'false'; btn.disabled = false; }
});
async function carregarOrcamentos() {
  const lista = document.getElementById('lista-orcamentos');
  if (!lista || !token) return;
  const form = document.getElementById('form-orcamento');
  if (form && !form.elements.mes.value) form.elements.mes.value = new Date().toISOString().slice(0,7);
  const categorias = [...new Set(movimentacoes.filter(m => (m.tipo || m.Tipo) === 'Despesa').map(m => m.categoria || m.Categoria).filter(Boolean))];
  document.getElementById('categorias-orcamento').innerHTML = categorias.map(c => `<option value="${escaparHtml(c)}"></option>`).join('');
  try {
    const orcamentos = await requisicaoFinanceira(API_ORCAMENTOS);
    lista.innerHTML = orcamentos.length ? orcamentos.map(o => {
      const gasto = movimentacoes.filter(m => (m.tipo || m.Tipo) === 'Despesa' && (m.categoria || m.Categoria) === o.categoria && String(m.data || m.Data).slice(0,7) === o.mes).reduce((a,m) => a + Number(m.valor ?? m.Valor ?? 0), 0);
      const percentual = o.limite > 0 ? gasto / o.limite * 100 : 0;
      return `<article class="widget-card feature-item"><div class="feature-item-header"><div><h3>${escaparHtml(o.categoria)}</h3><p>${escaparHtml(o.mes)}</p></div><button class="feature-danger" onclick="excluirOrcamento(${o.id})">Excluir</button></div><div class="feature-values"><strong>${BRL_UI(gasto)}</strong><span>de ${BRL_UI(o.limite)} • ${percentual.toFixed(0)}%</span></div><div class="feature-progress ${percentual >= 100 ? 'over' : ''}"><span style="width:${Math.min(100, percentual)}%"></span></div>${percentual >= 100 ? '<p class="feature-warning">Limite atingido ou ultrapassado.</p>' : ''}</article>`;
    }).join('') : '<p class="feature-empty">Nenhum orçamento cadastrado.</p>';
  } catch(e) { lista.textContent = `Não foi possível carregar os orçamentos: ${e.message}`; }
}
async function excluirOrcamento(id) {
  if (!confirm('Excluir este orçamento?')) return;
  try { await requisicaoFinanceira(`${API_ORCAMENTOS}/${id}`, { method:'DELETE' }); await carregarOrcamentos(); }
  catch(e) { alert(e.message); }
}
document.getElementById('form-orcamento')?.addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget;
  if (form.dataset.sending === 'true') return;
  form.dataset.sending = 'true'; const btn = form.querySelector('button'); btn.disabled = true;
  try {
    await requisicaoFinanceira(API_ORCAMENTOS, { method:'POST', body: JSON.stringify({ categoria: form.elements.categoria.value.trim(), mes: form.elements.mes.value, limite: Number(form.elements.limite.value) }) });
    mensagemFeature('orcamento-mensagem', 'Orçamento salvo!'); await carregarOrcamentos();
  } catch(e) { mensagemFeature('orcamento-mensagem', e.message); }
  finally { form.dataset.sending = 'false'; btn.disabled = false; }
});
function exportarHistoricoCSV() {
  // Mesma filtragem da tabela do histórico, sem depender dos filtros do dashboard.
  const busca = (document.getElementById('historico-busca')?.value || '').toLocaleLowerCase('pt-BR');
  const tipo = document.getElementById('historico-tipo')?.value || 'TODOS';
  const categoria = document.getElementById('historico-categoria')?.value || 'TODAS';
  const periodo = document.getElementById('historico-periodo')?.value || 'todos';
  const inicio = document.getElementById('historico-inicio')?.value;
  const fim = document.getElementById('historico-fim')?.value;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const filtradas = movimentacoes.filter(m => {
    const t = m.tipo || m.Tipo || ''; const c = m.categoria || m.Categoria || '';
    const d = String(m.data || m.Data || '').slice(0,10);
    const descricao = String(m.descricao || m.Descricao || '');
    if (tipo !== 'TODOS' && t !== tipo) return false;
    if (categoria !== 'TODAS' && c !== categoria) return false;
    if (busca && !`${descricao} ${c}`.toLocaleLowerCase('pt-BR').includes(busca)) return false;
    if (periodo === 'personalizado') return (!inicio || d >= inicio) && (!fim || d <= fim);
    if (periodo === 'ano') return d.slice(0,4) === String(hoje.getFullYear());
    if (/^\d+$/.test(periodo)) {
      const corte = new Date(hoje); corte.setDate(corte.getDate() - Number(periodo) + 1);
      const dataCorte = `${corte.getFullYear()}-${String(corte.getMonth()+1).padStart(2,'0')}-${String(corte.getDate()).padStart(2,'0')}`;
      return d >= dataCorte && d <= `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
    }
    return true;
  });
  // Excel exibe datas importadas como #### quando a coluna e estreita.
  // A formula abaixo retorna texto no formato brasileiro, evitando a conversao automatica em data.
  const dataParaExcel = valor => {
    const data = String(valor ?? '').slice(0, 10);
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
    if (!partes) return '';
    return `="${partes[3]}/${partes[2]}/${partes[1]}"`;
  };
  const celula = valor => `"${String(valor ?? '').replace(/"/g, '""')}"`;
  const linhas = [['Data','Tipo','Categoria','Descrição','Valor (R$)'], ...filtradas.map(m => [dataParaExcel(m.data || m.Data), m.tipo || m.Tipo, m.categoria || m.Categoria, m.descricao || m.Descricao, Number(m.valor ?? m.Valor ?? 0).toFixed(2).replace('.',',')])];
  const csv = '\uFEFF' + linhas.map(l => l.map(celula).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8;'}));
  const link = document.createElement('a'); link.href = url; link.download = `financetech-historico-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}


// ==============================
// FEEDBACK DOS USUÁRIOS
// ==============================
const API_FEEDBACK = `${API_BASE}/feedbacks`;
document.getElementById('form-feedback')?.addEventListener('submit', async function (evento) {
  evento.preventDefault();
  if (this.dataset.sending === 'true') return;
  const botao = this.querySelector('button[type="submit"]');
  const tipo = this.elements.tipo.value;
  const mensagem = this.elements.mensagem.value.trim();
  if (mensagem.length < 10 || mensagem.length > 2000) {
    mensagemFeature('feedback-mensagem', 'Escreva uma mensagem entre 10 e 2000 caracteres.');
    return;
  }
  this.dataset.sending = 'true';
  botao.disabled = true;
  mensagemFeature('feedback-mensagem', 'Enviando feedback...');
  try {
    await requisicaoFinanceira(API_FEEDBACK, { method: 'POST', body: JSON.stringify({ tipo, mensagem }) });
    this.reset();
    mensagemFeature('feedback-mensagem', 'Feedback enviado com sucesso! Obrigado por contribuir.');
  } catch (erro) {
    mensagemFeature('feedback-mensagem', `Não foi possível enviar: ${erro.message}`);
  } finally {
    this.dataset.sending = 'false';
    botao.disabled = false;
  }
});

// ==============================
// INICIALIZAÇÃO
// ==============================

if (token && usuarioLogado) {
  mostrarAplicativo();
} else {
  mostrarLogin();
}
