"use client";

import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts';

interface Conta { id: number; nome: string; instituicao: string; saldo_inicial: number; }
interface Cartao { id: number; nome: string; limite: number; dia_fechamento: number; dia_vencimento: number; }
interface Transacao { 
  id: number; 
  descricao: string; 
  valor: number; 
  tipo: string; 
  data_transacao: string; 
  pago?: boolean;
  categoria_id?: number; 
  conta_id: number;
  cartao_id?: number | null;
  forma_pagamento?: string;
  recorrente?: boolean;
  parcelado?: boolean;
  parcela_atual?: number;
  total_parcelas?: number;
}
interface Categoria { id: number; nome: string; tipo: string; }
interface Orcamento { id: number; limite: number; mes_ano: string; categoria_id: number; usuario_id: number; }
interface MetaEconomia { id: number; titulo: string; valor_alvo: number; valor_atual: number; data_limite?: string; usuario_id: number; }
interface FluxoCaixaMes { mes: string; entradas: number; saidas: number; liquido: number; }

const CORES_GRAFICO = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const PERGUNTAS_OPCOES = [
  "Qual o nome do seu primeiro animal de estimação?",
  "Em qual cidade você nasceu?",
  "Qual é o seu livro ou filme favorito?",
  "Qual o nome da sua primeira escola?",
  "Qual a sua comida favorita?",
  "Qual é o nome de solteira da sua mãe?"
];

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState<{ id: number; nome: string; email: string } | null>(null);
  
  // Estado das telas de autenticação
  const [telaAuth, setTelaAuth] = useState<string>('login');
  const [authErro, setAuthErro] = useState('');
  
  // Estado para alternar a visibilidade da senha (olhinho)
  const [mostrarSenha, setMostrarSenha] = useState(false);
  
  // Forms de Auth
  const [authForm, setAuthForm] = useState({ 
    nome: '', email: '', senha: '',
    p1: PERGUNTAS_OPCOES[0], r1: '',
    p2: PERGUNTAS_OPCOES[1], r2: '',
    p3: PERGUNTAS_OPCOES[2], r3: ''
  });

  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [perguntasRecuperacao, setPerguntasRecuperacao] = useState({ p1: '', p2: '', p3: '' });
  const [respostasRecuperacao, setRespostasRecuperacao] = useState({ r1: '', r2: '', r3: '' });
  const [novaSenhaRecuperacao, setNovaSenhaRecuperacao] = useState('');

  // Estados dos Dados Financeiros
  const [contas, setContas] = useState<Conta[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [metasEconomia, setMetasEconomia] = useState<MetaEconomia[]>([]);
  const [fluxoCaixa, setFluxoCaixa] = useState<FluxoCaixaMes[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState('');
  const [filtroMes, setFiltroMes] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'entrada' | 'saida'>('todas');
  const [filtroForma, setFiltroForma] = useState<string>('todas');

  const [contaSelecionadaVisualizacao, setContaSelecionadaVisualizacao] = useState<number | 'todas'>('todas');
  const [cartaoSelecionadoVisualizacao, setCartaoSelecionadoVisualizacao] = useState<number | 'todos'>('todos');
  const [darkMode, setDarkMode] = useState(false);

  // Modais do Painel
  const [modalTransacaoAberto, setModalTransacaoAberto] = useState(false);
  const [modalContaAberto, setModalContaAberto] = useState(false);
  const [modalCartaoAberto, setModalCartaoAberto] = useState(false);
  const [modalOrcamentoAberto, setModalOrcamentoAberto] = useState(false);
  const [modalMetaEconomiaAberto, setModalMetaEconomiaAberto] = useState(false);
  const [modalAlterarSenhaAberto, setModalAlterarSenhaAberto] = useState(false);
  
  // Edição
  const [transacaoEditandoId, setTransacaoEditandoId] = useState<number | null>(null);
  const [metaEditandoId, setMetaEditandoId] = useState<number | null>(null);
  const [orcamentoEditandoId, setOrcamentoEditandoId] = useState<number | null>(null);

  // Form Alterar Senha Logado
  const [formAlterarSenha, setFormAlterarSenha] = useState({ senha_atual: '', nova_senha: '', confirmar_senha: '' });
  const [alterarSenhaMsg, setAlterarSenhaMsg] = useState({ erro: '', sucesso: '' });

  // Forms de Operação Financeira
  const [formTransacao, setFormTransacao] = useState({
    descricao: '', valor: '', tipo: 'saida', categoria_id: '', conta_id: '', cartao_id: '',
    forma_pagamento: 'debito', recorrente: false, parcelado: false, total_parcelas: '1'
  });

  const [formConta, setFormConta] = useState({ nome: '', instituicao: '', saldo_inicial: '' });
  const [formCartao, setFormCartao] = useState({ nome: '', limite: '', dia_fechamento: '25', dia_vencimento: '2' });
  const [formOrcamento, setFormOrcamento] = useState({ categoria_id: '', limite: '', mes_ano: new Date().toISOString().substring(0, 7) });
  const [formMetaEconomia, setFormMetaEconomia] = useState({ titulo: '', valor_alvo: '', data_limite: '' });

  const buscarDados = async (userId: number) => {
    setCarregando(true);
    try {
      const resContas = await fetch(`http://localhost:8000/usuarios/${userId}/contas/`);
      const resCartoes = await fetch(`http://localhost:8000/usuarios/${userId}/cartoes/`);
      const resCategorias = await fetch(`http://localhost:8000/usuarios/${userId}/categorias/`);
      const resOrcamentos = await fetch(`http://localhost:8000/usuarios/${userId}/orcamentos/`);
      const resMetas = await fetch(`http://localhost:8000/usuarios/${userId}/metas-economia/`);
      const resFluxo = await fetch(`http://localhost:8000/usuarios/${userId}/fluxo-caixa/`);
      
      let listaContas: Conta[] = [];
      if (resContas.ok) {
        listaContas = await resContas.json();
        setContas(listaContas);
      }

      let listaCartoes: Cartao[] = [];
      if (resCartoes.ok) {
        listaCartoes = await resCartoes.json();
        setCartoes(listaCartoes);
      }

      let todasTransacoes: Transacao[] = [];
      for (const conta of listaContas) {
        const resT = await fetch(`http://localhost:8000/contas/${conta.id}/transacoes/`);
        if (resT.ok) {
          const dadosT = await resT.json();
          todasTransacoes = [...todasTransacoes, ...dadosT];
        }
      }
      todasTransacoes.sort((a, b) => new Date(b.data_transacao).getTime() - new Date(a.data_transacao).getTime());
      setTransacoes(todasTransacoes);

      if (resCategorias.ok) {
        const cat = await resCategorias.json();
        setCategorias(cat);
        if (cat.length > 0 && !formTransacao.categoria_id) {
          setFormTransacao(prev => ({ 
            ...prev, 
            categoria_id: cat[0].id.toString(),
            conta_id: listaContas.length > 0 ? listaContas[0].id.toString() : '',
            cartao_id: listaCartoes.length > 0 ? listaCartoes[0].id.toString() : ''
          }));
          setFormOrcamento(prev => ({ ...prev, categoria_id: cat[0].id.toString() }));
        }
      }

      if (resOrcamentos.ok) setOrcamentos(await resOrcamentos.json());
      if (resMetas.ok) setMetasEconomia(await resMetas.json());
      if (resFluxo.ok) setFluxoCaixa(await resFluxo.json());
    } catch (erro) {
      console.error("Erro na API:", erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    const salvo = localStorage.getItem('finia_usuario');
    if (salvo) setUsuarioLogado(JSON.parse(salvo));
  }, []);

  useEffect(() => {
    if (usuarioLogado) buscarDados(usuarioLogado.id);
  }, [usuarioLogado]);

  // Função para conectar via Open Finance
  const handleConectarOpenFinance = async () => {
    if (!usuarioLogado) return;
    try {
      const res = await fetch('/api/connect-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientUserId: usuarioLogado.id.toString() })
      });
      const data = await res.json();
      if (data.accessToken) {
        alert(`Token Open Finance gerado com sucesso! Access Token: ${data.accessToken.substring(0, 15)}...\n(Aqui a janela da Pluggy seria exibida para o usuário).`);
      } else {
        alert("Erro ao obter token de conexão bancária.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o serviço Open Finance.");
    }
  };

  // Handlers de Autenticação
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErro('');

    if (telaAuth === 'cadastro') {
      if (!authForm.r1 || !authForm.r2 || !authForm.r3) {
        setAuthErro("Responda às 3 perguntas de segurança para criar a conta.");
        return;
      }
      try {
        const res = await fetch('http://localhost:8000/usuarios/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authForm)
        });
        if (res.ok) {
          alert("Cadastro realizado com sucesso! Faça login.");
          
          // LIMPEZA DOS CAMPOS E RESET DO BOTÃO DA SENHA
          setAuthForm({
            nome: '', email: '', senha: '',
            p1: PERGUNTAS_OPCOES[0], r1: '',
            p2: PERGUNTAS_OPCOES[1], r2: '',
            p3: PERGUNTAS_OPCOES[2], r3: ''
          });
          setMostrarSenha(false);

          setTelaAuth('login');
        } else {
          const err = await res.json();
          setAuthErro(err.detail || "Erro ao cadastrar.");
        }
      } catch (e) {
        setAuthErro("Erro de conexão com o servidor.");
      }
    } else if (telaAuth === 'login') {
      try {
        const res = await fetch('http://localhost:8000/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authForm.email, senha: authForm.senha })
        });
        if (res.ok) {
          const data = await res.json();
          const usuario = { id: data.usuario_id, nome: data.nome, email: authForm.email };
          setUsuarioLogado(usuario);
          localStorage.setItem('finia_usuario', JSON.stringify(usuario));
          
          // Limpa as credenciais ao logar
          setAuthForm(prev => ({ ...prev, senha: '' }));
          setMostrarSenha(false);
        } else {
          setAuthErro("E-mail ou senha incorretos.");
        }
      } catch (e) {
        setAuthErro("Erro de conexão com o servidor.");
      }
    }
  };

  // Buscar as 3 perguntas de segurança cadastradas para o e-mail
  const handleBuscarPerguntas = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErro('');
    try {
      const res = await fetch(`http://localhost:8000/auth/perguntas/${emailRecuperacao}`);
      if (res.ok) {
        const data = await res.json();
        setPerguntasRecuperacao(data);
        setTelaAuth('esqueci_perguntas');
      } else {
        setAuthErro("E-mail não encontrado no sistema.");
      }
    } catch (err) {
      setAuthErro("Erro ao comunicar com o servidor.");
    }
  };

  // Validar respostas fornecidas (Exige pelo menos 2 acertos)
  const handleValidarRespostas = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErro('');
    try {
      const res = await fetch('http://localhost:8000/auth/validar-respostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailRecuperacao,
          r1: respostasRecuperacao.r1,
          r2: respostasRecuperacao.r2,
          r3: respostasRecuperacao.r3
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.valido) {
          setTelaAuth('redefinir');
        } else {
          setTelaAuth('bloqueado');
        }
      }
    } catch (err) {
      setAuthErro("Erro ao validar respostas de segurança.");
    }
  };

  // Redefinir senha após validação positiva
  const handleSubmeterRedefinicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErro('');
    if (novaSenhaRecuperacao.length < 6) {
      setAuthErro("A senha precisa conter no mínimo 6 caracteres.");
      return;
    }
    try {
      const res = await fetch('http://localhost:8000/auth/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailRecuperacao, nova_senha: novaSenhaRecuperacao })
      });
      if (res.ok) {
        alert("Senha redefinida com sucesso! Acesse sua conta.");
        setNovaSenhaRecuperacao('');
        setTelaAuth('login');
      }
    } catch (err) {
      setAuthErro("Erro ao atualizar a senha no servidor.");
    }
  };

  // Alterar Senha enquanto estiver Logado
  const handleSubmeterAlterarSenhaLogado = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlterarSenhaMsg({ erro: '', sucesso: '' });

    if (formAlterarSenha.nova_senha !== formAlterarSenha.confirmar_senha) {
      setAlterarSenhaMsg({ erro: 'A nova senha e a confirmação não coincidem.', sucesso: '' });
      return;
    }

    try {
      const res = await fetch(`http://localhost:8000/usuarios/${usuarioLogado?.id}/alterar-senha`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senha_atual: formAlterarSenha.senha_atual,
          nova_senha: formAlterarSenha.nova_senha
        })
      });

      if (res.ok) {
        setAlterarSenhaMsg({ erro: '', sucesso: 'Senha alterada com sucesso!' });
        setTimeout(() => {
          setModalAlterarSenhaAberto(false);
          setFormAlterarSenha({ senha_atual: '', nova_senha: '', confirmar_senha: '' });
        }, 1500);
      } else {
        const err = await res.json();
        setAlterarSenhaMsg({ erro: err.detail || 'Erro ao alterar senha.', sucesso: '' });
      }
    } catch (err) {
      setAlterarSenhaMsg({ erro: 'Erro de conexão com o servidor.', sucesso: '' });
    }
  };

  const handleLogout = () => {
    setUsuarioLogado(null);
    localStorage.removeItem('finia_usuario');
  };

  // Funções Financeiras CRUD
  const handleNovaCategoria = async () => {
    if (!usuarioLogado) return;
    const nomeCategoria = window.prompt(`Digite o nome da nova categoria de ${formTransacao.tipo.toUpperCase()}:`);
    if (!nomeCategoria) return; 

    try {
      const res = await fetch(`http://localhost:8000/usuarios/${usuarioLogado.id}/categorias/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeCategoria, tipo: formTransacao.tipo })
      });
      if (res.ok) {
        await buscarDados(usuarioLogado.id);
        alert(`Categoria "${nomeCategoria}" criada!`);
      }
    } catch (e) { console.error(e); }
  };

  const handleSubmeterTransacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioLogado) return;

    const payload = {
      descricao: formTransacao.descricao,
      valor: parseFloat(formTransacao.valor.replace(',', '.')),
      tipo: formTransacao.tipo,
      data_transacao: new Date().toISOString(),
      pago: formTransacao.forma_pagamento !== 'credito',
      conta_id: parseInt(formTransacao.conta_id),
      categoria_id: parseInt(formTransacao.categoria_id),
      cartao_id: formTransacao.forma_pagamento === 'credito' && formTransacao.cartao_id ? parseInt(formTransacao.cartao_id) : null,
      forma_pagamento: formTransacao.forma_pagamento,
      recorrente: (formTransacao.tipo === 'saida' && formTransacao.forma_pagamento === 'credito') ? formTransacao.recorrente : false,
      parcelado: (formTransacao.tipo === 'saida' && formTransacao.forma_pagamento === 'credito') ? formTransacao.parcelado : false,
      total_parcelas: (formTransacao.tipo === 'saida' && formTransacao.forma_pagamento === 'credito' && formTransacao.parcelado) ? parseInt(formTransacao.total_parcelas) : null
    };

    try {
      const url = transacaoEditandoId ? `http://localhost:8000/transacoes/${transacaoEditandoId}` : 'http://localhost:8000/transacoes/';
      const method = transacaoEditandoId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setModalTransacaoAberto(false);
        setTransacaoEditandoId(null);
        buscarDados(usuarioLogado.id);
      }
    } catch (e) { console.error(e); }
  };

  const abrirEdicaoTransacao = (t: Transacao) => {
    setTransacaoEditandoId(t.id);
    setFormTransacao({
      descricao: t.descricao,
      valor: t.valor.toString(),
      tipo: t.tipo,
      categoria_id: t.categoria_id ? t.categoria_id.toString() : (categorias[0]?.id.toString() || ''),
      conta_id: t.conta_id.toString(),
      cartao_id: t.cartao_id ? t.cartao_id.toString() : '',
      forma_pagamento: t.forma_pagamento || (t.tipo === 'entrada' ? 'pix' : 'debito'),
      recorrente: t.recorrente || false,
      parcelado: t.parcelado || false,
      total_parcelas: t.total_parcelas ? t.total_parcelas.toString() : '1'
    });
    setModalTransacaoAberto(true);
  };

  const handleAlternarPago = async (t: Transacao) => {
    try {
      const res = await fetch(`http://localhost:8000/transacoes/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: t.descricao,
          valor: t.valor,
          tipo: t.tipo,
          data_transacao: t.data_transacao,
          pago: !t.pago,
          conta_id: t.conta_id,
          categoria_id: t.categoria_id,
          cartao_id: t.cartao_id,
          forma_pagamento: t.forma_pagamento,
          recorrente: t.recorrente,
          parcelado: t.parcelado,
          total_parcelas: t.total_parcelas
        })
      });
      if (res.ok && usuarioLogado) buscarDados(usuarioLogado.id);
    } catch (e) { console.error(e); }
  };

  const handleSubmeterConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioLogado) return;

    const payload = {
      nome: formConta.nome,
      instituicao: formConta.instituicao,
      saldo_inicial: parseFloat(formConta.saldo_inicial.replace(',', '.'))
    };

    try {
      const res = await fetch(`http://localhost:8000/usuarios/${usuarioLogado.id}/contas/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setModalContaAberto(false);
        setFormConta({ nome: '', instituicao: '', saldo_inicial: '' });
        buscarDados(usuarioLogado.id);
      }
    } catch (e) { console.error(e); }
  };

  const handleSubmeterCartao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioLogado) return;

    const payload = {
      nome: formCartao.nome,
      limite: parseFloat(formCartao.limite.replace(',', '.')),
      dia_fechamento: parseInt(formCartao.dia_fechamento),
      dia_vencimento: parseInt(formCartao.dia_vencimento)
    };

    try {
      const res = await fetch(`http://localhost:8000/usuarios/${usuarioLogado.id}/cartoes/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setModalCartaoAberto(false);
        setFormCartao({ nome: '', limite: '', dia_fechamento: '25', dia_vencimento: '2' });
        buscarDados(usuarioLogado.id);
      }
    } catch (e) { console.error(e); }
  };

  const handleExcluirCartao = async (id: number) => {
    if (!confirm("Deseja excluir este cartão de crédito?")) return;
    try {
      const res = await fetch(`http://localhost:8000/cartoes/${id}`, { method: 'DELETE' });
      if (res.ok && usuarioLogado) {
        if (cartaoSelecionadoVisualizacao === id) setCartaoSelecionadoVisualizacao('todos');
        buscarDados(usuarioLogado.id);
      }
    } catch (e) { console.error(e); }
  };

  const handleSubmeterOrcamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioLogado) return;

    const payload = {
      limite: parseFloat(formOrcamento.limite.replace(',', '.')),
      mes_ano: formOrcamento.mes_ano,
      categoria_id: parseInt(formOrcamento.categoria_id)
    };

    try {
      const url = orcamentoEditandoId ? `http://localhost:8000/orcamentos/${orcamentoEditandoId}` : `http://localhost:8000/usuarios/${usuarioLogado.id}/orcamentos/`;
      const method = orcamentoEditandoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setModalOrcamentoAberto(false);
        setOrcamentoEditandoId(null);
        setFormOrcamento({ categoria_id: categorias[0]?.id.toString() || '', limite: '', mes_ano: new Date().toISOString().substring(0, 7) });
        buscarDados(usuarioLogado.id);
      }
    } catch (e) { console.error(e); }
  };

  const abrirEdicaoOrcamento = (orc: Orcamento) => {
    setOrcamentoEditandoId(orc.id);
    setFormOrcamento({
      categoria_id: orc.categoria_id.toString(),
      limite: orc.limite.toString(),
      mes_ano: orc.mes_ano
    });
    setModalOrcamentoAberto(true);
  };

  const handleExcluirOrcamento = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este teto de gastos?")) return;
    try {
      const res = await fetch(`http://localhost:8000/orcamentos/${id}`, { method: 'DELETE' });
      if (res.ok && usuarioLogado) buscarDados(usuarioLogado.id);
    } catch (e) { console.error(e); }
  };

  const handleSubmeterMetaEconomia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioLogado) return;

    const payload = {
      titulo: formMetaEconomia.titulo,
      valor_alvo: parseFloat(formMetaEconomia.valor_alvo.replace(',', '.')),
      valor_atual: 0.0,
      data_limite: formMetaEconomia.data_limite || null
    };

    try {
      const url = metaEditandoId ? `http://localhost:8000/metas-economia/${metaEditandoId}` : `http://localhost:8000/usuarios/${usuarioLogado.id}/metas-economia/`;
      const method = metaEditandoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setModalMetaEconomiaAberto(false);
        setMetaEditandoId(null);
        setFormMetaEconomia({ titulo: '', valor_alvo: '', data_limite: '' });
        buscarDados(usuarioLogado.id);
      }
    } catch (e) { console.error(e); }
  };

  const abrirEdicaoMeta = (meta: MetaEconomia) => {
    setMetaEditandoId(meta.id);
    setFormMetaEconomia({
      titulo: meta.titulo,
      valor_alvo: meta.valor_alvo.toString(),
      data_limite: meta.data_limite || ''
    });
    setModalMetaEconomiaAberto(true);
  };

  const handleExcluirMeta = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta meta de economia?")) return;
    try {
      const res = await fetch(`http://localhost:8000/metas-economia/${id}`, { method: 'DELETE' });
      if (res.ok && usuarioLogado) buscarDados(usuarioLogado.id);
    } catch (e) { console.error(e); }
  };

  const handleDepositarMeta = async (metaId: number) => {
    const valorStr = window.prompt("Quanto você deseja adicionar a esta meta? (R$)");
    if (!valorStr) return;
    const valor = parseFloat(valorStr.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) return alert("Valor inválido.");

    try {
      const res = await fetch(`http://localhost:8000/metas-economia/${metaId}/adicionar?valor=${valor}`, {
        method: 'PUT'
      });
      if (res.ok && usuarioLogado) buscarDados(usuarioLogado.id);
    } catch (e) { console.error(e); }
  };

  const handleExcluirConta = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!usuarioLogado) return;
    if (!confirm("Excluir esta conta e suas transações?")) return;
    try {
      const res = await fetch(`http://localhost:8000/contas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (contaSelecionadaVisualizacao === id) setContaSelecionadaVisualizacao('todas');
        buscarDados(usuarioLogado.id);
      }
    } catch (e) { console.error(e); }
  };

  const handleExcluirTransacao = async (id: number) => {
    if (!usuarioLogado) return;
    if (!confirm("Tem certeza que deseja excluir?")) return;
    try {
      const res = await fetch(`http://localhost:8000/transacoes/${id}`, { method: 'DELETE' });
      if (res.ok) buscarDados(usuarioLogado.id);
    } catch (e) { console.error(e); }
  };

  const exportarParaCSV = () => {
    if (transacoesFiltradas.length === 0) {
      alert("Não há transações filtradas para exportar.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,ID,Descricao,Valor,Tipo,FormaPagamento,Data,Status\n";

    transacoesFiltradas.forEach(t => {
      const status = t.pago !== false ? "Pago" : "Pendente";
      const linha = [
        t.id,
        `"${t.descricao.replace(/"/g, '""')}"`,
        t.valor,
        t.tipo,
        t.forma_pagamento || 'debito',
        t.data_transacao.substring(0, 10),
        status
      ].join(",");
      csvContent += linha + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `extrato_finia_${filtroMes}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const transacoesVisiveis = React.useMemo(() => {
    let lista = transacoes;
    if (contaSelecionadaVisualizacao !== 'todas') {
      lista = lista.filter(t => t.conta_id === contaSelecionadaVisualizacao);
    }
    if (cartaoSelecionadoVisualizacao !== 'todos') {
      lista = lista.filter(t => t.cartao_id === cartaoSelecionadoVisualizacao);
    }
    return lista;
  }, [transacoes, contaSelecionadaVisualizacao, cartaoSelecionadoVisualizacao]);

  const dadosGrafico = React.useMemo(() => {
    const gastos = transacoesVisiveis.filter(t => t.tipo === 'saida');
    const agrupado: { [key: string]: number } = {};
    gastos.forEach(t => {
      const cat = categorias.find(c => c.id === t.categoria_id);
      const nomeCat = cat ? cat.nome : 'Outros';
      agrupado[nomeCat] = (agrupado[nomeCat] || 0) + t.valor;
    });
    return Object.keys(agrupado).map(nome => ({ name: nome, value: agrupado[nome] }));
  }, [transacoesVisiveis, categorias]);

  const contasVisiveis = contaSelecionadaVisualizacao === 'todas' ? contas : contas.filter(c => c.id === contaSelecionadaVisualizacao);
  const saldoInicialVisivel = contasVisiveis.reduce((acc, c) => acc + c.saldo_inicial, 0);
  
  const entradasVisiveis = transacoesVisiveis.filter(t => t.tipo === 'entrada' && t.pago !== false).reduce((acc, t) => acc + t.valor, 0);
  const saidasVisiveis = transacoesVisiveis.filter(t => t.tipo === 'saida' && (t.pago !== false || t.forma_pagamento !== 'credito')).reduce((acc, t) => acc + t.valor, 0);
  const saldoAtualVisivel = saldoInicialVisivel + entradasVisiveis - saidasVisiveis;

  const formatarMoeda = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarData = (str: string) => new Date(str).toLocaleDateString('pt-BR');
  const categoriasFiltradas = categorias.filter(c => c.tipo === formTransacao.tipo);

  const transacoesFiltradas = transacoesVisiveis.filter(t => {
    const correspondeBusca = t.descricao.toLowerCase().includes(busca.toLowerCase());
    const correspondeMes = filtroMes === 'todos' || t.data_transacao.substring(0, 7) === filtroMes;
    const correspondeTipo = filtroTipo === 'todas' || t.tipo === filtroTipo;
    const correspondeForma = filtroForma === 'todas' || t.forma_pagamento === filtroForma;

    return correspondeBusca && correspondeMes && correspondeTipo && correspondeForma;
  });

  // TELA DE AUTENTICAÇÃO (LOGIN / CADASTRO / RECUPERAÇÃO)
  if (!usuarioLogado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-lg shadow-2xl my-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-emerald-400">FinIA</h1>
            <p className="text-xs text-slate-400 mt-1">Gestão Financeira Inteligente</p>
          </div>

          {(telaAuth === 'login' || telaAuth === 'cadastro') && (
            <div className="flex bg-slate-800 p-1 rounded-xl mb-6">
              <button onClick={() => { setTelaAuth('login'); setAuthErro(''); setMostrarSenha(false); }} 
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${telaAuth === 'login' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>
                Entrar
              </button>
              <button onClick={() => { setTelaAuth('cadastro'); setAuthErro(''); setMostrarSenha(false); }} 
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${telaAuth === 'cadastro' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>
                Cadastrar
              </button>
            </div>
          )}

          {authErro && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm mb-4">{authErro}</div>}

          {(telaAuth === 'login' || telaAuth === 'cadastro') && (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {telaAuth === 'cadastro' && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Nome Completo</label>
                  <input type="text" required placeholder="Seu nome" value={authForm.nome} onChange={e => setAuthForm({...authForm, nome: e.target.value})}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-500" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">E-mail</label>
                <input type="email" required placeholder="seu@email.com" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-500" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-400">Senha</label>
                  {telaAuth === 'login' && (
                    <button type="button" onClick={() => { setTelaAuth('esqueci_email'); setAuthErro(''); }} className="text-xs text-emerald-400 hover:underline">
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                
                {/* Campo de Senha com o Botão de Olhinho */}
                <div className="relative flex items-center">
                  <input 
                    type={mostrarSenha ? "text" : "password"} 
                    required 
                    placeholder="••••••••" 
                    value={authForm.senha} 
                    onChange={e => setAuthForm({...authForm, senha: e.target.value})}
                    className="w-full p-3 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-500" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setMostrarSenha(!mostrarSenha)} 
                    className="absolute right-3 text-slate-400 hover:text-slate-200 text-sm select-none"
                    title={mostrarSenha ? "Ocultar senha" : "Ver senha"}
                  >
                    {mostrarSenha ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Cadastro das 3 Perguntas de Segurança */}
              {telaAuth === 'cadastro' && (
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Perguntas de Segurança (para recuperação)</p>
                  
                  <div>
                    <select value={authForm.p1} onChange={e => setAuthForm({...authForm, p1: e.target.value})} className="w-full p-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-300 mb-1">
                      {PERGUNTAS_OPCOES.map((p, idx) => <option key={idx} value={p}>{p}</option>)}
                    </select>
                    <input type="text" required placeholder="Sua resposta (palavra-chave)" value={authForm.r1} onChange={e => setAuthForm({...authForm, r1: e.target.value})}
                      className="w-full p-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-500" />
                  </div>

                  <div>
                    <select value={authForm.p2} onChange={e => setAuthForm({...authForm, p2: e.target.value})} className="w-full p-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-300 mb-1">
                      {PERGUNTAS_OPCOES.map((p, idx) => <option key={idx} value={p}>{p}</option>)}
                    </select>
                    <input type="text" required placeholder="Sua resposta (palavra-chave)" value={authForm.r2} onChange={e => setAuthForm({...authForm, r2: e.target.value})}
                      className="w-full p-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-500" />
                  </div>

                  <div>
                    <select value={authForm.p3} onChange={e => setAuthForm({...authForm, p3: e.target.value})} className="w-full p-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-300 mb-1">
                      {PERGUNTAS_OPCOES.map((p, idx) => <option key={idx} value={p}>{p}</option>)}
                    </select>
                    <input type="text" required placeholder="Sua resposta (palavra-chave)" value={authForm.r3} onChange={e => setAuthForm({...authForm, r3: e.target.value})}
                      className="w-full p-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-500" />
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg mt-2">
                {telaAuth === 'login' ? 'Acessar Sistema' : 'Criar Conta Gratuita'}
              </button>
            </form>
          )}

          {/* Recuperação - Passo 1: Informar E-mail */}
          {telaAuth === 'esqueci_email' && (
            <form onSubmit={handleBuscarPerguntas} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-white">Recuperação de Senha</h3>
                <p className="text-xs text-slate-400 mt-1">Digite seu e-mail cadastrado para responder às suas palavras-chave.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">E-mail</label>
                <input type="email" required placeholder="seu@email.com" value={emailRecuperacao} onChange={e => setEmailRecuperacao(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-500" />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg mt-2">
                Buscar Perguntas de Segurança
              </button>
              <button type="button" onClick={() => { setTelaAuth('login'); setAuthErro(''); }} className="w-full text-xs text-slate-400 hover:text-white mt-3 text-center block">
                Voltar para o Login
              </button>
            </form>
          )}

          {/* Recuperação - Passo 2: Responder Perguntas (Mínimo 2 acertos) */}
          {telaAuth === 'esqueci_perguntas' && (
            <form onSubmit={handleValidarRespostas} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-white">Validação de Segurança</h3>
                <p className="text-xs text-slate-400 mt-1">Responda corretamente a pelo menos 2 das perguntas para redefinir sua senha.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1">{perguntasRecuperacao.p1}</label>
                <input type="text" required placeholder="Sua resposta" value={respostasRecuperacao.r1} onChange={e => setRespostasRecuperacao({...respostasRecuperacao, r1: e.target.value})}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-500 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1">{perguntasRecuperacao.p2}</label>
                <input type="text" required placeholder="Sua resposta" value={respostasRecuperacao.r2} onChange={e => setRespostasRecuperacao({...respostasRecuperacao, r2: e.target.value})}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-500 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1">{perguntasRecuperacao.p3}</label>
                <input type="text" required placeholder="Sua resposta" value={respostasRecuperacao.r3} onChange={e => setRespostasRecuperacao({...respostasRecuperacao, r3: e.target.value})}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-500 text-sm" />
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg mt-2">
                Validar Respostas
              </button>
              <button type="button" onClick={() => { setTelaAuth('login'); setAuthErro(''); }} className="w-full text-xs text-slate-400 hover:text-white mt-2 text-center block">
                Cancelar
              </button>
            </form>
          )}

          {/* Recuperação - Passo 3: Digitar a Nova Senha */}
          {telaAuth === 'redefinir' && (
            <form onSubmit={handleSubmeterRedefinicao} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-emerald-400">🎉 Validação Aprovada!</h3>
                <p className="text-xs text-slate-400 mt-1">Digite sua nova senha abaixo para salvar.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nova Senha</label>
                <input type="password" required placeholder="••••••••" value={novaSenhaRecuperacao} onChange={e => setNovaSenhaRecuperacao(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-emerald-500" />
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg mt-2">
                Salvar Nova Senha
              </button>
            </form>
          )}

          {/* Tela de Bloqueio caso erre as respostas */}
          {telaAuth === 'bloqueado' && (
            <div className="text-center space-y-4 py-4">
              <div className="text-red-400 text-4xl">⚠️</div>
              <h3 className="text-xl font-bold text-white">Validação Incompleta</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Você não atingiu o mínimo de 2 acertos nas perguntas de segurança.
              </p>
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 text-xs text-slate-300">
                Por favor, entre em contato com o suporte para redefinir o seu acesso:<br />
                <span className="font-bold text-emerald-400 text-sm block mt-2">marcosandreramos566@gmail.com</span>
              </div>
              <button type="button" onClick={() => { setTelaAuth('login'); setAuthErro(''); }} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg mt-4">
                Voltar para o Login
              </button>
            </div>
          )}

        </div>
      </div>
    );
  }

  // PAINEL PRINCIPAL DO SISTEMA (USUÁRIO AUTENTICADO)
  return (
    <div className={`flex h-screen relative transition-colors duration-200 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-slate-900'}`}>
      
      {/* SIDEBAR LATERAL */}
      <aside className={`w-64 flex flex-col z-10 border-r bg-slate-900 border-slate-800 text-white`}>
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-emerald-400">FinIA</h1>
          <p className="text-xs text-slate-400 mt-1">Olá, {usuarioLogado.nome}</p>
        </div>
        
        <div className="px-4 mt-6 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Visão Geral</p>
          <button onClick={() => { setContaSelecionadaVisualizacao('todas'); setCartaoSelecionadoVisualizacao('todos'); }}
            className={`w-full flex items-center py-2.5 px-4 rounded-lg text-sm font-medium transition-colors mb-4 ${contaSelecionadaVisualizacao === 'todas' && cartaoSelecionadoVisualizacao === 'todos' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
            Todas as Contas
          </button>
          
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Suas Contas</p>
          <div className="space-y-1.5 mb-6">
            {contas.map(c => (
              <button key={c.id} onClick={() => { setContaSelecionadaVisualizacao(c.id); setCartaoSelecionadoVisualizacao('todos'); }}
                className={`w-full flex justify-between items-center py-2 px-3 rounded-lg text-xs font-medium transition-colors ${contaSelecionadaVisualizacao === c.id ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800'}`}>
                <span>{c.nome}</span>
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cartões de Crédito</p>
          <div className="space-y-2 mb-4">
            {cartoes.map(card => {
              const gastoCartao = transacoes
                .filter(t => t.cartao_id === card.id && t.tipo === 'saida')
                .reduce((acc, t) => acc + t.valor, 0);
              const limiteDisponivel = card.limite - gastoCartao;

              return (
                <div key={card.id} onClick={() => setCartaoSelecionadoVisualizacao(card.id)}
                     className={`p-3 rounded-xl border cursor-pointer transition-colors ${cartaoSelecionadoVisualizacao === card.id ? 'bg-purple-900/30 border-purple-500/50 text-white' : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-xs">{card.nome}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleExcluirCartao(card.id); }} className="text-slate-500 hover:text-red-400 text-xs">✕</button>
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Fatura: {formatarMoeda(gastoCartao)}</span>
                    <span className="text-emerald-400">Disp: {formatarMoeda(limiteDisponivel)}</span>
                  </div>
                </div>
              );
            })}
            <button onClick={() => setModalCartaoAberto(true)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-semibold border border-slate-700">
              + Novo Cartão
            </button>
          </div>

          <div className="mt-6 mb-4">
            <button onClick={handleConectarOpenFinance} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md flex items-center justify-center gap-2">
              🔗 Conectar Banco (Open Finance)
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium">
            {darkMode ? "☀️ Modo Claro" : "🌙 Modo Escuro"}
          </button>
          
          <button onClick={() => { setAlterarSenhaMsg({ erro: '', sucesso: '' }); setModalAlterarSenhaAberto(true); }} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium">
            ⚙️ Alterar Senha
          </button>

          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium">
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL / DASHBOARD */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {cartaoSelecionadoVisualizacao !== 'todos' 
                ? `Fatura: ${cartoes.find(c => c.id === cartaoSelecionadoVisualizacao)?.nome}`
                : (contaSelecionadaVisualizacao === 'todas' ? 'Visão Geral' : contas.find(c => c.id === contaSelecionadaVisualizacao)?.nome)}
            </h2>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Acompanhe suas finanças, orçamentos e cartões de crédito.</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button onClick={() => {
              setMetaEditandoId(null);
              setFormMetaEconomia({ titulo: '', valor_alvo: '', data_limite: '' });
              setModalMetaEconomiaAberto(true);
            }} className="bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 px-3 py-2 rounded-lg font-medium shadow-sm text-sm">
              🏆 Metas
            </button>
            <button onClick={() => {
              setOrcamentoEditandoId(null);
              setFormOrcamento({ categoria_id: categorias[0]?.id.toString() || '', limite: '', mes_ano: new Date().toISOString().substring(0, 7) });
              setModalOrcamentoAberto(true);
            }} className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg font-medium shadow-sm text-sm">
              🎯 Orçamento
            </button>
            <button onClick={() => {
                setTransacaoEditandoId(null);
                setFormTransacao({ 
                  descricao: '', valor: '', tipo: 'saida', 
                  categoria_id: categorias[0]?.id.toString() || '', 
                  conta_id: contaSelecionadaVisualizacao === 'todas' ? (contas[0]?.id.toString() || '') : contaSelecionadaVisualizacao.toString(),
                  cartao_id: cartaoSelecionadoVisualizacao !== 'todos' ? cartaoSelecionadoVisualizacao.toString() : (cartoes[0]?.id.toString() || ''),
                  forma_pagamento: cartaoSelecionadoVisualizacao !== 'todos' ? 'credito' : 'debito', 
                  recorrente: false, parcelado: false, total_parcelas: '1'
                });
                setModalTransacaoAberto(true);
              }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm text-sm">
              + Transação
            </button>
          </div>
        </header>

        {/* CARDS RESUMO DE VALORES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`p-6 rounded-xl shadow-sm border ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <h3 className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Saldo Atual</h3>
            <p className={`text-3xl font-bold mt-2 ${saldoAtualVisivel >= 0 ? (darkMode ? 'text-white' : 'text-slate-800') : 'text-red-500'}`}>
              {carregando ? "..." : formatarMoeda(saldoAtualVisivel)}
            </p>
          </div>
          <div className={`p-6 rounded-xl shadow-sm border ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <h3 className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Entradas</h3>
            <p className="text-3xl font-bold text-emerald-500 mt-2">{carregando ? "..." : `+ ${formatarMoeda(entradasVisiveis)}`}</p>
          </div>
          <div className={`p-6 rounded-xl shadow-sm border ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <h3 className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Saídas</h3>
            <p className="text-3xl font-bold text-red-500 mt-2">{carregando ? "..." : `- ${formatarMoeda(saidasVisiveis)}`}</p>
          </div>
        </div>

        {/* METAS DE ECONOMIA */}
        <div className={`p-6 rounded-xl shadow-sm border mb-8 ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Metas de Economia & Reserva</h3>
            <button onClick={() => {
              setMetaEditandoId(null);
              setFormMetaEconomia({ titulo: '', valor_alvo: '', data_limite: '' });
              setModalMetaEconomiaAberto(true);
            }} className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg">
              + Nova Meta
            </button>
          </div>

          {metasEconomia.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">Nenhuma meta de economia criada ainda.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metasEconomia.map(meta => {
                const porcentagem = Math.min(Math.round((meta.valor_atual / meta.valor_alvo) * 100), 100);
                const concluida = meta.valor_atual >= meta.valor_alvo;

                return (
                  <div key={meta.id} className={`p-4 rounded-lg border flex flex-col justify-between relative group ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-sm">{meta.titulo}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-400">{porcentagem}%</span>
                          <button onClick={() => abrirEdicaoMeta(meta)} className="text-slate-400 hover:text-blue-400 text-xs" title="Editar Meta">✎</button>
                          <button onClick={() => handleExcluirMeta(meta.id)} className="text-slate-400 hover:text-red-400 text-xs" title="Excluir Meta">✕</button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">Guardado: {formatarMoeda(meta.valor_atual)} / Meta: {formatarMoeda(meta.valor_alvo)}</p>
                      
                      <div className="w-full bg-slate-700/20 h-2.5 rounded-full overflow-hidden mb-3">
                        <div className={`h-full transition-all duration-500 ${concluida ? 'bg-emerald-500' : 'bg-blue-500'}`}
                             style={{ width: `${porcentagem}%` }}></div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[11px] text-slate-400">{concluida ? '🎉 Meta Alcançada!' : (meta.data_limite ? `Prazo: ${formatarData(meta.data_limite)}` : 'Sem prazo')}</span>
                      <button onClick={() => handleDepositarMeta(meta.id)} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-md font-medium">
                        + Depositar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ORÇAMENTO / TETO DE GASTOS */}
        <div className={`p-6 rounded-xl shadow-sm border mb-8 ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Orçamento por Categoria (Teto de Gastos)</h3>
            <button onClick={() => {
              setOrcamentoEditandoId(null);
              setFormOrcamento({ categoria_id: categorias[0]?.id.toString() || '', limite: '', mes_ano: new Date().toISOString().substring(0, 7) });
              setModalOrcamentoAberto(true);
            }} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg">
              + Novo Teto
            </button>
          </div>
          
          {orcamentos.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">Nenhum orçamento definido.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orcamentos.map(orc => {
                const cat = categorias.find(c => c.id === orc.categoria_id);
                const mesAtual = new Date().toISOString().substring(0, 7);
                const gastoCategoria = transacoesVisiveis
                  .filter(t => t.tipo === 'saida' && t.pago !== false && t.categoria_id === orc.categoria_id && t.data_transacao.substring(0, 7) === mesAtual)
                  .reduce((acc, t) => acc + t.valor, 0);

                const porcentagem = Math.min(Math.round((gastoCategoria / orc.limite) * 100), 100);
                const estourou = gastoCategoria > orc.limite;

                return (
                  <div key={orc.id} className={`p-4 rounded-lg border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-sm">{cat ? cat.nome : 'Categoria'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{formatarMoeda(gastoCategoria)} / {formatarMoeda(orc.limite)}</span>
                        <button onClick={() => abrirEdicaoOrcamento(orc)} className="text-slate-400 hover:text-blue-400 text-xs" title="Editar Orçamento">✎</button>
                        <button onClick={() => handleExcluirOrcamento(orc.id)} className="text-slate-400 hover:text-red-400 text-xs" title="Excluir Orçamento">✕</button>
                      </div>
                    </div>
                    
                    <div className="w-full bg-slate-700/20 h-2.5 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${estourou ? 'bg-red-500' : porcentagem > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                           style={{ width: `${porcentagem}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-[11px]">
                      <span className={estourou ? 'text-red-400 font-bold' : 'text-slate-400'}>
                        {estourou ? '⚠️ Orçamento estourado!' : `${porcentagem}% utilizado`}
                      </span>
                      <span className="text-slate-400">Mês: {orc.mes_ano}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* GRÁFICO DE GASTOS */}
        <div className={`p-6 rounded-xl shadow-sm border mb-8 flex flex-col items-center ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
          <h3 className={`text-lg font-semibold mb-2 w-full text-left ${darkMode ? 'text-white' : 'text-slate-800'}`}>Distribuição de Gastos por Categoria</h3>
          
          {dadosGrafico.length === 0 ? (
            <p className="text-slate-400 text-sm py-12">Nenhum gasto registrado.</p>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dadosGrafico} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}>
                    {dadosGrafico.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CORES_GRAFICO[index % CORES_GRAFICO.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatarMoeda(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* TABELAS DE EXTRATO E CONTAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`p-6 rounded-xl shadow-sm border h-[480px] flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Últimas Transações</h3>
              <button onClick={exportarParaCSV} className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold px-3 py-1.5 rounded-lg">
                📥 Exportar CSV
              </button>
            </div>

            <div className="flex flex-col gap-2 mb-4">
              <div className="flex gap-2">
                <input type="text" placeholder="Pesquisar descrição..." value={busca} onChange={e => setBusca(e.target.value)}
                  className={`flex-1 p-2 text-sm border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                <input type="month" value={filtroMes === 'todos' ? '' : filtroMes} onChange={e => setFiltroMes(e.target.value ? e.target.value : 'todos')}
                  className={`p-2 text-sm border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>

              <div className="flex gap-2 text-xs">
                <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)}
                  className={`flex-1 p-2 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
                  <option value="todas">Tipos: Todos</option>
                  <option value="entrada">Apenas Entradas</option>
                  <option value="saida">Apenas Saídas</option>
                </select>

                <select value={filtroForma} onChange={e => setFiltroForma(e.target.value)}
                  className={`flex-1 p-2 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
                  <option value="todas">Forma: Todas</option>
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="salario">Salário</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              {transacoesFiltradas.length === 0 ? (
                <p className="text-slate-400 text-sm text-center mt-10">Nenhuma transação encontrada.</p>
              ) : (
                <ul className="space-y-3">
                  {transacoesFiltradas.map((t) => {
                    const cartaoTransacao = cartoes.find(c => c.id === t.cartao_id);
                    return (
                      <li key={t.id} className={`flex justify-between items-center p-3 rounded-lg border-b last:border-0 ${darkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-10 rounded-full ${t.tipo === 'entrada' ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                          <div>
                            <p className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{t.descricao}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{formatarData(t.data_transacao)}</span>
                              <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold">
                                {t.forma_pagamento || 'debito'} {cartaoTransacao ? `(${cartaoTransacao.nome})` : ''}
                              </span>
                              {t.recorrente && <span className="bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded text-[10px]">Recorrente</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`font-bold ${t.tipo === 'entrada' ? 'text-emerald-500' : 'text-slate-400'}`}>
                              {t.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(t.valor)}
                            </p>
                            <button 
                              onClick={() => handleAlternarPago(t)}
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors mt-0.5 ${
                                t.pago !== false 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {t.pago !== false ? 'Pago' : 'Pendente'}
                            </button>
                          </div>
                          <button onClick={() => abrirEdicaoTransacao(t)} className="text-slate-400 hover:text-blue-400 p-1">✎</button>
                          <button onClick={() => handleExcluirTransacao(t.id)} className="text-slate-400 hover:text-red-400 p-1">✕</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          
          <div className={`p-6 rounded-xl shadow-sm border h-[480px] flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Minhas Contas</h3>
              <button onClick={() => setModalContaAberto(true)} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg">
                + Nova Conta
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <ul className="space-y-3">
                {contas.map((c) => (
                  <li key={c.id} onClick={() => { setContaSelecionadaVisualizacao(c.id); setCartaoSelecionadoVisualizacao('todos'); }}
                      className={`flex justify-between items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                        contaSelecionadaVisualizacao === c.id && cartaoSelecionadoVisualizacao === 'todos'
                          ? (darkMode ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-emerald-50 border-emerald-200') 
                          : (darkMode ? 'bg-slate-800/50 border-slate-800 hover:bg-slate-800' : 'bg-slate-50 border-slate-100 hover:bg-slate-100')
                      }`}
                  >
                    <div>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-700'}`}>{c.nome}</p>
                      <p className="text-xs text-slate-400">{c.instituicao}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={(e) => handleExcluirConta(e, c.id)} className="text-slate-400 hover:text-red-500 p-1">✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL ALTERAR SENHA (LOGADO) */}
      {modalAlterarSenhaAberto && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">⚙️ Alterar Senha</h3>
              <button onClick={() => setModalAlterarSenhaAberto(false)} className="text-slate-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>

            {alterarSenhaMsg.erro && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm mb-4">{alterarSenhaMsg.erro}</div>}
            {alterarSenhaMsg.sucesso && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-sm mb-4">{alterarSenhaMsg.sucesso}</div>}

            <form onSubmit={handleSubmeterAlterarSenhaLogado} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Senha Atual</label>
                <input type="password" required placeholder="••••••••" value={formAlterarSenha.senha_atual} onChange={e => setFormAlterarSenha({...formAlterarSenha, senha_atual: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nova Senha</label>
                <input type="password" required placeholder="••••••••" value={formAlterarSenha.nova_senha} onChange={e => setFormAlterarSenha({...formAlterarSenha, nova_senha: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirmar Nova Senha</label>
                <input type="password" required placeholder="••••••••" value={formAlterarSenha.confirmar_senha} onChange={e => setFormAlterarSenha({...formAlterarSenha, confirmar_senha: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg mt-4">
                Atualizar Senha
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAIS DIVERSAS (TRANSAÇÃO, CONTA, CARTÃO, ORÇAMENTO, METAS) */}
      {modalTransacaoAberto && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{transacaoEditandoId ? "Editar Transação" : "Nova Transação"}</h3>
              <button onClick={() => setModalTransacaoAberto(false)} className="text-slate-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmeterTransacao} className="space-y-4">
              <div className="flex gap-4 mb-4">
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <input type="radio" name="tipo" value="saida" checked={formTransacao.tipo === 'saida'} onChange={e => setFormTransacao({...formTransacao, tipo: e.target.value, forma_pagamento: 'debito'})} className="accent-red-500"/>
                  <span>Saída</span>
                </label>
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <input type="radio" name="tipo" value="entrada" checked={formTransacao.tipo === 'entrada'} onChange={e => setFormTransacao({...formTransacao, tipo: e.target.value, forma_pagamento: 'pix'})} className="accent-emerald-500"/>
                  <span>Entrada</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {formTransacao.tipo === 'entrada' ? 'Forma de Recebimento' : 'Forma de Pagamento'}
                </label>
                <select value={formTransacao.forma_pagamento} onChange={e => setFormTransacao({...formTransacao, forma_pagamento: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
                  {formTransacao.tipo === 'entrada' ? (
                    <>
                      <option value="pix">PIX / Transferência</option>
                      <option value="salario">Salário</option>
                      <option value="investimento">Investimento</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="outro">Outro</option>
                    </>
                  ) : (
                    <>
                      <option value="debito">Débito</option>
                      <option value="credito">Crédito</option>
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                    </>
                  )}
                </select>
              </div>

              {formTransacao.tipo === 'saida' && formTransacao.forma_pagamento === 'credito' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Cartão de Crédito</label>
                  <select required value={formTransacao.cartao_id} onChange={e => setFormTransacao({...formTransacao, cartao_id: e.target.value})}
                    className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
                    <option value="" disabled>Selecione o cartão...</option>
                    {cartoes.map(card => <option key={card.id} value={card.id}>{card.nome}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <input type="text" required placeholder="Ex: Mercado" value={formTransacao.descricao} onChange={e => setFormTransacao({...formTransacao, descricao: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor (R$)</label>
                <input type="number" step="0.01" required placeholder="0.00" value={formTransacao.valor} onChange={e => setFormTransacao({...formTransacao, valor: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>

              {formTransacao.tipo === 'saida' && formTransacao.forma_pagamento === 'credito' && (
                <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/50 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1">Recorrente</label>
                      <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <input type="checkbox" checked={formTransacao.recorrente} onChange={e => setFormTransacao({...formTransacao, recorrente: e.target.checked})} className="accent-emerald-500 w-4 h-4"/>
                        <span className="text-xs">Todo mês</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Parcelado?</label>
                      <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <input type="checkbox" checked={formTransacao.parcelado} onChange={e => setFormTransacao({...formTransacao, parcelado: e.target.checked})} className="accent-emerald-500 w-4 h-4"/>
                        <span className="text-xs">Sim</span>
                      </label>
                    </div>
                  </div>

                  {formTransacao.parcelado && (
                    <div>
                      <label className="block text-xs font-medium mb-1">Número de Parcelas</label>
                      <input type="number" min="2" max="60" value={formTransacao.total_parcelas} onChange={e => setFormTransacao({...formTransacao, total_parcelas: e.target.value})}
                        className={`w-full p-2 text-sm border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Conta Vinculada</label>
                  <select required value={formTransacao.conta_id} onChange={e => setFormTransacao({...formTransacao, conta_id: e.target.value})}
                    className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
                    <option value="" disabled>Selecione...</option>
                    {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-sm font-medium">Categoria</label>
                    <button type="button" onClick={handleNovaCategoria} className="text-xs text-emerald-500 hover:underline">+ Nova</button>
                  </div>
                  <select required value={formTransacao.categoria_id} onChange={e => setFormTransacao({...formTransacao, categoria_id: e.target.value})}
                    className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
                    <option value="" disabled>Selecione...</option>
                    {categoriasFiltradas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg mt-4">Salvar</button>
            </form>
          </div>
        </div>
      )}

      {modalContaAberto && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Nova Conta</h3>
              <button onClick={() => setModalContaAberto(false)} className="text-slate-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmeterConta} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input type="text" required placeholder="Ex: Nubank" value={formConta.nome} onChange={e => setFormConta({...formConta, nome: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Instituição</label>
                <input type="text" required placeholder="Ex: Banco Digital" value={formConta.instituicao} onChange={e => setFormConta({...formConta, instituicao: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Saldo Inicial</label>
                <input type="number" step="0.01" required placeholder="0.00" value={formConta.saldo_inicial} onChange={e => setFormConta({...formConta, saldo_inicial: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg mt-4">Criar Conta</button>
            </form>
          </div>
        </div>
      )}

      {modalCartaoAberto && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Novo Cartão de Crédito</h3>
              <button onClick={() => setModalCartaoAberto(false)} className="text-slate-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmeterCartao} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome do Cartão</label>
                <input type="text" required placeholder="Ex: Nubank Ultravioleta" value={formCartao.nome} onChange={e => setFormCartao({...formCartao, nome: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Limite Total (R$)</label>
                <input type="number" step="0.01" required placeholder="Ex: 5000.00" value={formCartao.limite} onChange={e => setFormCartao({...formCartao, limite: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Dia Fechamento</label>
                  <input type="number" min="1" max="31" required value={formCartao.dia_fechamento} onChange={e => setFormCartao({...formCartao, dia_fechamento: e.target.value})}
                    className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dia Vencimento</label>
                  <input type="number" min="1" max="31" required value={formCartao.dia_vencimento} onChange={e => setFormCartao({...formCartao, dia_vencimento: e.target.value})}
                    className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg mt-4">Criar Cartão</button>
            </form>
          </div>
        </div>
      )}

      {modalOrcamentoAberto && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{orcamentoEditandoId ? "Editar Orçamento" : "Definir Orçamento de Gastos"}</h3>
              <button onClick={() => setModalOrcamentoAberto(false)} className="text-slate-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmeterOrcamento} className="space-y-4">
              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-sm font-medium">Categoria de Saída</label>
                  <button type="button" onClick={async () => {
                      if (!usuarioLogado) return;
                      const nomeCat = window.prompt("Digite o nome da nova categoria de saída:");
                      if (!nomeCat) return;
                      try {
                        const res = await fetch(`http://localhost:8000/usuarios/${usuarioLogado.id}/categorias/`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ nome: nomeCat, tipo: 'saida' })
                        });
                        if (res.ok) {
                          await buscarDados(usuarioLogado.id);
                          alert(`Categoria "${nomeCat}" criada!`);
                        }
                      } catch (e) { console.error(e); }
                    }} className="text-xs text-emerald-500 hover:underline">+ Nova</button>
                </div>
                <select required value={formOrcamento.categoria_id} onChange={e => setFormOrcamento({...formOrcamento, categoria_id: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
                  <option value="" disabled>Selecione...</option>
                  {categorias.filter(c => c.tipo === 'saida').map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Limite de Gasto (R$)</label>
                <input type="number" step="0.01" required placeholder="Ex: 500.00" value={formOrcamento.limite} onChange={e => setFormOrcamento({...formOrcamento, limite: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mês e Ano</label>
                <input type="month" required value={formOrcamento.mes_ano} onChange={e => setFormOrcamento({...formOrcamento, mes_ano: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg mt-4">
                {orcamentoEditandoId ? "Salvar Alterações" : "Salvar Orçamento"}
              </button>
            </form>
          </div>
        </div>
      )}

      {modalMetaEconomiaAberto && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{metaEditandoId ? "Editar Meta de Economia" : "Nova Meta de Economia"}</h3>
              <button onClick={() => setModalMetaEconomiaAberto(false)} className="text-slate-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmeterMetaEconomia} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título do Objetivo</label>
                <input type="text" required placeholder="Ex: Viagem para Praia, Carro Novo" value={formMetaEconomia.titulo} onChange={e => setFormMetaEconomia({...formMetaEconomia, titulo: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor Alvo (R$)</label>
                <input type="number" step="0.01" required placeholder="Ex: 5000.00" value={formMetaEconomia.valor_alvo} onChange={e => setFormMetaEconomia({...formMetaEconomia, valor_alvo: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data Limite (Opcional)</label>
                <input type="date" value={formMetaEconomia.data_limite} onChange={e => setFormMetaEconomia({...formMetaEconomia, data_limite: e.target.value})}
                  className={`w-full p-3 border rounded-lg outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg mt-4">
                {metaEditandoId ? "Salvar Alterações" : "Criar Meta"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}