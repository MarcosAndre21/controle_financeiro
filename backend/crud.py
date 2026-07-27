# Arquivo: backend/crud.py
from sqlalchemy.orm import Session
import models
import schemas

# ==========================================
# OPERAÇÕES DE USUÁRIO
# ==========================================
# backend/crud.py
def criar_usuario(db: Session, usuario: schemas.UsuarioCreate):
    db_usuario = models.Usuario(
        nome=usuario.nome,
        email=usuario.email,
        senha=usuario.senha,
        p1=usuario.p1,
        r1=usuario.r1.strip().lower() if usuario.r1 else None,
        p2=usuario.p2,
        r2=usuario.r2.strip().lower() if usuario.r2 else None,
        p3=usuario.p3,
        r3=usuario.r3.strip().lower() if usuario.r3 else None,
    )
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)
    return db_usuario

def get_usuario_por_email(db: Session, email: str):
    return db.query(models.Usuario).filter(models.Usuario.email == email).first()

# ==========================================
# OPERAÇÕES DE CONTA
# ==========================================
def criar_conta(db: Session, conta: schemas.ContaCreate, usuario_id: int):
    db_conta = models.Conta(**conta.model_dump(), usuario_id=usuario_id)
    db.add(db_conta)
    db.commit()
    db.refresh(db_conta)
    return db_conta

def get_contas_do_usuario(db: Session, usuario_id: int):
    return db.query(models.Conta).filter(models.Conta.usuario_id == usuario_id).all()

# ==========================================
# OPERAÇÕES DE CATEGORIA
# ==========================================
def criar_categoria(db: Session, categoria: schemas.CategoriaCreate, usuario_id: int):
    db_categoria = models.Categoria(**categoria.model_dump(), usuario_id=usuario_id)
    db.add(db_categoria)
    db.commit()
    db.refresh(db_categoria)
    return db_categoria

def get_categorias(db: Session, usuario_id: int):
    return db.query(models.Categoria).filter(models.Categoria.usuario_id == usuario_id).all()

# ==========================================
# OPERAÇÕES DE TRANSAÇÃO
# ==========================================
from datetime import datetime
from dateutil.relativedelta import relativedelta
def criar_transacao(db: Session, transacao: schemas.TransacaoCreate, usuario_id: int):
    # Se for parcelado e tiver total de parcelas, gera os registros futuros
    if transacao.parcelado and transacao.total_parcelas and transacao.total_parcelas > 1:
        data_base = datetime.fromisoformat(transacao.data_transacao.replace('Z', '+00:00'))
        
        primeira_transacao = None
        for i in range(1, transacao.total_parcelas + 1):
            nova_data = data_base + relativedelta(months=(i - 1))
            nova_data_str = nova_data.isoformat()  # <--- COLODE ESTA LINHA AQUI
            
            db_t = models.Transacao(
                descricao=f"{transacao.descricao} ({i}/{transacao.total_parcelas})",
                valor=transacao.valor,
                tipo=transacao.tipo,
                data_transacao=nova_data_str,  # <--- E UTILIZA A STRING AQUI
                pago=transacao.pago if i == 1 else False,
                recorrente=False,
                parcelado=True,
                parcela_atual=i,
                total_parcelas=transacao.total_parcelas,
                conta_id=transacao.conta_id,
                categoria_id=transacao.categoria_id
            )
            db.add(db_t)
            if i == 1:
                primeira_transacao = db_t
        db.commit()
        db.refresh(primeira_transacao)
        return primeira_transacao
    else:
        db_transacao = models.Transacao(**transacao.dict())
        db.add(db_transacao)
        db.commit()
        db.refresh(db_transacao)
        return db_transacao

def get_transacoes_da_conta(db: Session, conta_id: int):
    # Executa a verificação de recorrência antes de retornar
    verificar_e_gerar_recorrencias(db, conta_id)
    
    return db.query(models.Transacao).filter(models.Transacao.conta_id == conta_id).all()

def deletar_transacao(db: Session, transacao_id: int):
    transacao = db.query(models.Transacao).filter(models.Transacao.id == transacao_id).first()
    if transacao:
        db.delete(transacao)
        db.commit()
        return True
    return False
def atualizar_transacao(db: Session, transacao_id: int, dados_transacao: schemas.TransacaoCreate):
    transacao = db.query(models.Transacao).filter(models.Transacao.id == transacao_id).first()
    if transacao:
        transacao.descricao = dados_transacao.descricao
        transacao.valor = dados_transacao.valor
        transacao.tipo = dados_transacao.tipo
        transacao.categoria_id = dados_transacao.categoria_id
        db.commit()
        db.refresh(transacao)
        return transacao
    return None
def deletar_conta(db: Session, conta_id: int):
    conta = db.query(models.Conta).filter(models.Conta.id == conta_id).first()
    if conta:
        # Opcional: Se quiser apagar também as transações vinculadas a essa conta, 
        # o SQLAlchemy pode lidar com isso ou podemos deletar manualmente:
        db.query(models.Transacao).filter(models.Transacao.conta_id == conta_id).delete()
        db.delete(conta)
        db.commit()
        return True
    return False

def criar_ou_atualizar_orcamento(db: Session, orcamento: schemas.OrcamentoCreate, usuario_id: int):
    # Verifica se já existe um orçamento para essa categoria nesse mês
    db_orcamento = db.query(models.Orcamento).filter(
        models.Orcamento.usuario_id == usuario_id,
        models.Orcamento.categoria_id == orcamento.categoria_id,
        models.Orcamento.mes_ano == orcamento.mes_ano
    ).first()

    if db_orcamento:
        db_orcamento.limite = orcamento.limite
        db.commit()
        db.refresh(db_orcamento)
        return db_orcamento
    
    novo_orcamento = models.Orcamento(
        limite=orcamento.limite,
        mes_ano=orcamento.mes_ano,
        categoria_id=orcamento.categoria_id,
        usuario_id=usuario_id
    )
    db.add(novo_orcamento)
    db.commit()
    db.refresh(novo_orcamento)
    return novo_orcamento

def get_orcamentos_usuario(db: Session, usuario_id: int):
    return db.query(models.Orcamento).filter(models.Orcamento.usuario_id == usuario_id).all()
def criar_categoria_usuario(db: Session, categoria: schemas.CategoriaCreate, usuario_id: int):
    db_categoria = models.Categoria(
        nome=categoria.nome,
        tipo=categoria.tipo,
        usuario_id=usuario_id
    )
    db.add(db_categoria)
    db.commit()
    db.refresh(db_categoria)
    return db_categoria

def criar_meta_economia(db: Session, meta: schemas.MetaEconomiaCreate, usuario_id: int):
    db_meta = models.MetaEconomia(
        titulo=meta.titulo,
        valor_alvo=meta.valor_alvo,
        valor_atual=meta.valor_atual,
        data_limite=meta.data_limite,
        usuario_id=usuario_id
    )
    db.add(db_meta)
    db.commit()
    db.refresh(db_meta)
    return db_meta

def get_metas_economia(db: Session, usuario_id: int):
    return db.query(models.MetaEconomia).filter(models.MetaEconomia.usuario_id == usuario_id).all()

def atualizar_progresso_meta(db: Session, meta_id: int, valor_adicional: float):
    meta = db.query(models.MetaEconomia).filter(models.MetaEconomia.id == meta_id).first()
    if meta:
        meta.valor_atual += valor_adicional
        db.commit()
        db.refresh(meta)
    return meta

def atualizar_meta_economia(db: Session, meta_id: int, meta_data: schemas.MetaEconomiaCreate):
    meta = db.query(models.MetaEconomia).filter(models.MetaEconomia.id == meta_id).first()
    if meta:
        meta.titulo = meta_data.titulo
        meta.valor_alvo = meta_data.valor_alvo
        meta.data_limite = meta_data.data_limite
        db.commit()
        db.refresh(meta)
    return meta

def deletar_meta_economia(db: Session, meta_id: int):
    meta = db.query(models.MetaEconomia).filter(models.MetaEconomia.id == meta_id).first()
    if meta:
        db.delete(meta)
        db.commit()
    return meta

def verificar_e_gerar_recorrencias(db: Session, conta_id: int):
    # Pega todas as transações da conta que são recorrentes
    recorrentes = db.query(models.Transacao).filter(
        models.Transacao.conta_id == conta_id,
        models.Transacao.recorrente == True
    ).all()

    mes_atual_str = datetime.now().strftime("%Y-%m")

    for rec in recorrentes:
        data_rec = datetime.fromisoformat(rec.data_transacao.replace('Z', '+00:00'))
        mes_rec_str = data_rec.strftime("%Y-%m")

        # Se a transação recorrente é de um mês anterior ao atual, verificamos se já existe cópia neste mês
        if mes_rec_str < mes_atual_str:
            # Procura se já existe uma transação com a mesma descrição e data no mês atual
            existe_no_mes_atual = db.query(models.Transacao).filter(
                models.Transacao.conta_id == conta_id,
                models.Transacao.descricao == rec.descricao,
                models.Transacao.data_transacao.like(f"{mes_atual_str}%")
            ).first()

            # Se ainda não existe, cria a despesa/receita para o mês atual
            if not existe_no_mes_atual:
                nova_data = data_rec.replace(year=datetime.now().year, month=datetime.now().month)
                
                nova_transacao = models.Transacao(
                    descricao=rec.descricao,
                    valor=rec.valor,
                    tipo=rec.tipo,
                    data_transacao=nova_data.isoformat(),
                    pago=False,  # Contas recorrentes futuras entram pendentes até você pagar/confirmar
                    recorrente=True,
                    parcelado=False,
                    conta_id=rec.conta_id,
                    categoria_id=rec.categoria_id
                )
                db.add(nova_transacao)
    db.commit()