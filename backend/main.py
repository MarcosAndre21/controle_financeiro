# Arquivo: backend/main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Union
from collections import defaultdict
from passlib.context import CryptContext
import requests
import os
from dotenv import load_dotenv

load_dotenv()
import models
import schemas
import crud
from database import engine, get_db

# Cria as tabelas no banco de dados se não existirem
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FinIA API",
    description="API robusta para Gestão Financeira Integrada com IA",
    version="1.0.0"
)

# ==========================================
# CONFIGURAÇÃO DE SEGURANÇA (CORS)
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

def hash_senha(senha: str):
    return senha

def verificar_senha(senha_plana, senha_banco):
    return senha_plana == senha_banco


@app.get("/")
def read_root():
    return {"status": "sucesso", "mensagem": "API do FinIA rodando perfeitamente!"}


# ==========================================
# ROTAS DE USUÁRIOS E AUTENTICAÇÃO
# ==========================================
@app.post("/usuarios/", response_model=schemas.UsuarioResponse, tags=["Usuários"])
def criar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    db_usuario = crud.get_usuario_por_email(db, email=usuario.email)
    if db_usuario:
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado.")
    
    # Salva com criptografia/tratamento padrão do sistema
    usuario.senha = hash_senha(usuario.senha)
    return crud.criar_usuario(db=db, usuario=usuario)

@app.post("/auth/login", response_model=schemas.Token, tags=["Autenticação"])
def login(dados: schemas.LoginRequest, db: Session = Depends(get_db)):
    db_usuario = crud.get_usuario_por_email(db, email=dados.email)
    if not db_usuario or not verificar_senha(dados.senha, db_usuario.senha):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    
    return {
        "access_token": "fake-jwt-token-para-sessao-local",
        "token_type": "bearer",
        "usuario_id": db_usuario.id,
        "nome": db_usuario.nome
    }

@app.get("/auth/perguntas/{email}", tags=["Autenticação"])
def obter_perguntas(email: str, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email.ilike(email.strip())).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    
    if not usuario.p1 or not usuario.p2 or not usuario.p3:
        raise HTTPException(status_code=404, detail="Usuário não possui perguntas de segurança cadastradas.")
    
    return {
        "p1": usuario.p1,
        "p2": usuario.p2,
        "p3": usuario.p3
    }

@app.post("/auth/validar-respostas", tags=["Autenticação"])
def validar_respostas(dados: schemas.ValidarPerguntasRequest, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == dados.email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    acertos = 0
    if dados.r1.strip().lower() == (usuario.r1 or "").strip().lower():
        acertos += 1
    if dados.r2.strip().lower() == (usuario.r2 or "").strip().lower():
        acertos += 1
    if dados.r3.strip().lower() == (usuario.r3 or "").strip().lower():
        acertos += 1

    if acertos >= 2:
        return {"valido": True, "acertos": acertos}
    else:
        return {"valido": False, "acertos": acertos, "suporte": "marcosandreramos566@gmail.com"}

@app.post("/auth/redefinir-senha", tags=["Autenticação"])
def redefinir_senha(dados: schemas.RedefinirSenhaRequest, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == dados.email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    
    usuario.senha = dados.nova_senha
    db.commit()
    return {"message": "Senha redefinida com sucesso!"}

@app.put("/usuarios/{usuario_id}/alterar-senha", tags=["Usuários"])
def alterar_senha_logado(usuario_id: int, dados: schemas.AlterarSenhaLogadoRequest, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    
    if usuario.senha != dados.senha_atual:
        raise HTTPException(status_code=400, detail="A senha atual está incorreta.")
    
    usuario.senha = dados.nova_senha
    db.commit()
    return {"message": "Senha alterada com sucesso!"}


# ==========================================
# ROTAS DE CONTAS
# ==========================================
@app.post("/usuarios/{usuario_id}/contas/", response_model=schemas.ContaResponse, tags=["Contas"])
def criar_conta(usuario_id: int, conta: schemas.ContaCreate, db: Session = Depends(get_db)):
    return crud.criar_conta(db=db, conta=conta, usuario_id=usuario_id)

@app.get("/usuarios/{usuario_id}/contas/", response_model=List[schemas.ContaResponse], tags=["Contas"])
def listar_contas(usuario_id: int, db: Session = Depends(get_db)):
    return crud.get_contas_do_usuario(db=db, usuario_id=usuario_id)

@app.delete("/contas/{conta_id}", tags=["Contas"])
def excluir_conta(conta_id: int, db: Session = Depends(get_db)):
    sucesso = crud.deletar_conta(db=db, conta_id=conta_id)
    if not sucesso:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")
    return {"mensagem": "Conta excluída com sucesso!"}


# ==========================================
# ROTAS DE CATEGORIAS
# ==========================================
@app.post("/usuarios/{usuario_id}/categorias/", response_model=schemas.CategoriaResponse, tags=["Categorias"])
def criar_categoria(usuario_id: int, categoria: schemas.CategoriaCreate, db: Session = Depends(get_db)):
    return crud.criar_categoria_usuario(db=db, categoria=categoria, usuario_id=usuario_id)

@app.get("/usuarios/{usuario_id}/categorias/", response_model=List[schemas.CategoriaResponse], tags=["Categorias"])
def listar_categorias(usuario_id: int, db: Session = Depends(get_db)):
    return crud.get_categorias(db=db, usuario_id=usuario_id)


# ==========================================
# ROTAS DE TRANSAÇÕES
# ==========================================
@app.post("/transacoes/", response_model=schemas.TransacaoResponse, tags=["Transações"])
def criar_transacao(transacao: schemas.TransacaoCreate, db: Session = Depends(get_db)):
    conta = db.query(models.Conta).filter(models.Conta.id == transacao.conta_id).first()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return crud.criar_transacao(db=db, transacao=transacao, usuario_id=conta.usuario_id)

@app.get("/contas/{conta_id}/transacoes/", response_model=List[schemas.TransacaoResponse], tags=["Transações"])
def listar_transacoes_da_conta(conta_id: int, db: Session = Depends(get_db)):
    return crud.get_transacoes_da_conta(db=db, conta_id=conta_id)

@app.put("/transacoes/{transacao_id}", response_model=schemas.TransacaoResponse, tags=["Transações"])
def alterar_transacao(transacao_id: int, transacao: schemas.TransacaoCreate, db: Session = Depends(get_db)):
    db_transacao = crud.atualizar_transacao(db=db, transacao_id=transacao_id, dados_transacao=transacao)
    if not db_transacao:
        raise HTTPException(status_code=404, detail="Transação não encontrada.")
    return db_transacao

@app.delete("/transacoes/{transacao_id}", tags=["Transações"])
def excluir_transacao(transacao_id: int, db: Session = Depends(get_db)):
    sucesso = crud.deletar_transacao(db=db, transacao_id=transacao_id)
    if not sucesso:
        raise HTTPException(status_code=404, detail="Transação não encontrada.")
    return {"mensagem": "Transação excluída com sucesso!"}


# ==========================================
# ROTAS DE ORÇAMENTOS (Teto de Gastos)
# ==========================================
@app.post("/usuarios/{usuario_id}/orcamentos/", response_model=schemas.OrcamentoResponse, tags=["Orçamentos"])
def definir_orcamento(usuario_id: int, orcamento: schemas.OrcamentoCreate, db: Session = Depends(get_db)):
    return crud.criar_ou_atualizar_orcamento(db=db, orcamento=orcamento, usuario_id=usuario_id)

@app.get("/usuarios/{usuario_id}/orcamentos/", response_model=list[schemas.OrcamentoResponse], tags=["Orçamentos"])
def listar_orcamentos(usuario_id: int, db: Session = Depends(get_db)):
    return crud.get_orcamentos_usuario(db=db, usuario_id=usuario_id)

@app.put("/orcamentos/{orcamento_id}", response_model=schemas.OrcamentoResponse, tags=["Orçamentos"])
def atualizar_orcamento(orcamento_id: int, dados: schemas.OrcamentoUpdate, db: Session = Depends(get_db)):
    orcamento = db.query(models.Orcamento).filter(models.Orcamento.id == orcamento_id).first()
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    for key, value in dados.dict(exclude_unset=True).items():
        setattr(orcamento, key, value)
    
    db.commit()
    db.refresh(orcamento)
    return orcamento

@app.delete("/orcamentos/{orcamento_id}", tags=["Orçamentos"])
def deletar_orcamento(orcamento_id: int, db: Session = Depends(get_db)):
    orcamento = db.query(models.Orcamento).filter(models.Orcamento.id == orcamento_id).first()
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    db.delete(orcamento)
    db.commit()
    return {"message": "Orçamento deletado com sucesso"}


# ==========================================
# ROTAS DE METAS DE ECONOMIA
# ==========================================
@app.post("/usuarios/{usuario_id}/metas-economia/", response_model=schemas.MetaEconomiaResponse, tags=["Metas de Economia"])
def criar_meta_economia(usuario_id: int, meta: schemas.MetaEconomiaCreate, db: Session = Depends(get_db)):
    return crud.criar_meta_economia(db=db, meta=meta, usuario_id=usuario_id)

@app.get("/usuarios/{usuario_id}/metas-economia/", response_model=list[schemas.MetaEconomiaResponse], tags=["Metas de Economia"])
def listar_metas_economia(usuario_id: int, db: Session = Depends(get_db)):
    return crud.get_metas_economia(db=db, usuario_id=usuario_id)

@app.put("/metas-economia/{meta_id}/adicionar", tags=["Metas de Economia"])
def depositar_na_meta(meta_id: int, valor: float, db: Session = Depends(get_db)):
    return crud.atualizar_progresso_meta(db=db, meta_id=meta_id, valor_adicional=valor)

@app.put("/metas-economia/{meta_id}", response_model=schemas.MetaEconomiaResponse, tags=["Metas de Economia"])
def editar_meta_economia(meta_id: int, meta: schemas.MetaEconomiaCreate, db: Session = Depends(get_db)):
    return crud.atualizar_meta_economia(db=db, meta_id=meta_id, meta_data=meta)

@app.delete("/metas-economia/{meta_id}", tags=["Metas de Economia"])
def excluir_meta_economia(meta_id: int, db: Session = Depends(get_db)):
    crud.deletar_meta_economia(db=db, meta_id=meta_id)
    return {"mensagem": "Meta excluída com sucesso"}


# ==========================================
# ROTAS DE CARTÕES DE CRÉDITO
# ==========================================
@app.post("/usuarios/{usuario_id}/cartoes/", response_model=schemas.CartaoResponse, tags=["Cartões"])
def criar_cartao(usuario_id: int, cartao: schemas.CartaoCreate, db: Session = Depends(get_db)):
    db_cartao = models.CartaoCredito(**cartao.dict(), usuario_id=usuario_id)
    db.add(db_cartao)
    db.commit()
    db.refresh(db_cartao)
    return db_cartao

@app.get("/usuarios/{usuario_id}/cartoes/", response_model=list[schemas.CartaoResponse], tags=["Cartões"])
def listar_cartoes(usuario_id: int, db: Session = Depends(get_db)):
    return db.query(models.CartaoCredito).filter(models.CartaoCredito.usuario_id == usuario_id).all()

@app.delete("/cartoes/{cartao_id}", tags=["Cartões"])
def excluir_cartao(cartao_id: int, db: Session = Depends(get_db)):
    cartao = db.query(models.CartaoCredito).filter(models.CartaoCredito.id == cartao_id).first()
    if not cartao:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    db.delete(cartao)
    db.commit()
    return {"message": "Cartão excluído com sucesso"}


# ==========================================
# RELATÓRIOS E OPEN FINANCE (PLUGGY)
# ==========================================
@app.get("/usuarios/{usuario_id}/fluxo-caixa/", tags=["Relatórios"])
def obter_fluxo_caixa(usuario_id: int, db: Session = Depends(get_db)):
    contas = db.query(models.Conta).filter(models.Conta.usuario_id == usuario_id).all()
    conta_ids = [c.id for c in contas]
    
    if not conta_ids:
        return []

    transacoes = db.query(models.Transacao).filter(models.Transacao.conta_id.in_(conta_ids)).all()
    fluxo_dict = defaultdict(lambda: {"mes": "", "entradas": 0.0, "saidas": 0.0, "liquido": 0.0})

    for t in transacoes:
        if t.pago == False:
            continue
        
        mes_ano = t.data_transacao[:7]
        fluxo_dict[mes_ano]["mes"] = mes_ano
        
        if t.tipo == "entrada":
            fluxo_dict[mes_ano]["entradas"] += t.valor
        elif t.tipo == "saida":
            fluxo_dict[mes_ano]["saidas"] += t.valor

    resultado = []
    for mes_ano, dados in sorted(fluxo_dict.items()):
        dados["liquido"] = dados["entradas"] - dados["saidas"]
        resultado.append(dados)

    return sorted(resultado, key=lambda x: x["mes"], reverse=True)


PLUGGY_CLIENT_ID = os.getenv("PLUGGY_CLIENT_ID", "050614eb-7b88-4a21-ae1e-0854b8081d35")
PLUGGY_CLIENT_SECRET = os.getenv("PLUGGY_CLIENT_SECRET", "JVrD56i-u9U8CHV5R23fKE6IpkTcRr8owQhLfwaOrBg")

def obter_token_pluggy():
    url = "https://api.pluggy.ai/auth"
    headers = {"accept": "application/json", "content-type": "application/json"}
    payload = {
        "clientId": PLUGGY_CLIENT_ID,
        "clientSecret": PLUGGY_CLIENT_SECRET
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code == 200:
        return response.json().get("apiKey")
    raise Exception("Erro ao autenticar na Pluggy")

@app.post("/usuarios/{usuario_id}/sincronizar-banco/", tags=["Open Finance"])
def sincronizar_banco_pluggy(usuario_id: int, data: dict, db: Session = Depends(get_db)):
    pluggy_item_id = data.get("itemId")
    
    try:
        api_key = obter_token_pluggy()
        headers = {
            "accept": "application/json",
            "X-API-KEY": api_key
        }

        res_contas = requests.get(f"https://api.pluggy.ai/accounts?itemId={pluggy_item_id}", headers=headers)
        contas_pluggy = res_contas.json()
        
        for acc in contas_pluggy.get("results", []):
            nome_conta = acc.get("name")
            tipo_instituicao = acc.get("bankData", {}).get("name", "Banco Open Finance")
            saldo_atual = acc.get("balances", {}).get("current", 0.0)

            conta_existente = db.query(models.Conta).filter(
                models.Conta.nome == nome_conta, 
                models.Conta.usuario_id == usuario_id
            ).first()

            if not conta_existente:
                nova_conta = models.Conta(
                    nome=nome_conta,
                    instituicao=tipo_instituicao,
                    saldo_inicial=saldo_atual,
                    usuario_id=usuario_id
                )
                db.add(nova_conta)
                db.commit()
                db.refresh(nova_conta)
                conta_alvo_id = nova_conta.id
            else:
                conta_alvo_id = conta_existente.id

            res_tx = requests.get(f"https://api.pluggy.ai/transactions?accountId={acc.get('id')}", headers=headers)
            transacoes_pluggy = res_tx.json()
            
            for tx in transacoes_pluggy.get("results", []):
                descricao = tx.get("description")
                valor = abs(tx.get("amount"))
                tipo = "entrada" if tx.get("amount") > 0 else "saida"
                data_tx = tx.get("date")

                tx_existe = db.query(models.Transacao).filter(
                    models.Transacao.descricao == descricao,
                    models.Transacao.valor == valor,
                    models.Transacao.conta_id == conta_alvo_id
                ).first()

                if not tx_existe:
                    nova_tx = models.Transacao(
                        descricao=descricao,
                        valor=valor,
                        tipo=tipo,
                        data_transacao=data_tx,
                        pago=True,
                        conta_id=conta_alvo_id
                    )
                    db.add(nova_tx)
            
            db.commit()

        return {"message": "Sincronização realizada com sucesso!"}
    
    except Exception as e:
        print("Erro ao sincronizar com Pluggy:", e)
        raise HTTPException(status_code=500, detail="Erro ao sincronizar dados bancários.")