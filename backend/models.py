from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    senha = Column(String, nullable=False)

    contas = relationship("Conta", back_populates="usuario", cascade="all, delete-orphan")
    categorias = relationship("Categoria", back_populates="usuario", cascade="all, delete-orphan")
    orcamentos = relationship("Orcamento", back_populates="usuario", cascade="all, delete-orphan")
    metas_economia = relationship("MetaEconomia", back_populates="usuario", cascade="all, delete-orphan")
    cartoes = relationship("CartaoCredito", back_populates="usuario", cascade="all, delete-orphan")
    itens_bancarios = relationship("ItemBancario", back_populates="usuario", cascade="all, delete-orphan")

    p1 = Column(String, nullable=True)
    r1 = Column(String, nullable=True)
    p2 = Column(String, nullable=True)
    r2 = Column(String, nullable=True)
    p3 = Column(String, nullable=True)
    r3 = Column(String, nullable=True)

class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    tipo = Column(String, nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"))

    usuario = relationship("Usuario", back_populates="categorias")
    transacoes = relationship("Transacao", back_populates="categoria", cascade="all, delete-orphan")
    orcamentos = relationship("Orcamento", back_populates="categoria", cascade="all, delete-orphan")


class Conta(Base):
    __tablename__ = "contas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    instituicao = Column(String, nullable=False)
    saldo_inicial = Column(Float, nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"))

    usuario = relationship("Usuario", back_populates="contas")
    transacoes = relationship("Transacao", back_populates="conta", cascade="all, delete-orphan")


class Transacao(Base):
    __tablename__ = "transacoes"

    id = Column(Integer, primary_key=True, index=True)
    descricao = Column(String, nullable=False)
    valor = Column(Float, nullable=False)
    tipo = Column(String, nullable=False) # 'entrada' ou 'saida'
    data_transacao = Column(String, nullable=False)
    pago = Column(Boolean, default=True)
    
    # Novo campo para a forma de pagamento
    forma_pagamento = Column(String, default="debito") # 'debito', 'credito', 'pix', 'dinheiro'
    
    recorrente = Column(Boolean, default=False)
    parcelado = Column(Boolean, default=False)
    parcela_atual = Column(Integer, nullable=True)
    total_parcelas = Column(Integer, nullable=True)

    conta_id = Column(Integer, ForeignKey("contas.id", ondelete="CASCADE"))
    categoria_id = Column(Integer, ForeignKey("categorias.id", ondelete="SET NULL"), nullable=True)

    conta = relationship("Conta", back_populates="transacoes")
    categoria = relationship("Categoria", back_populates="transacoes")

    cartao_id = Column(Integer, ForeignKey("cartoes_credito.id", ondelete="SET NULL"), nullable=True)
    cartao = relationship("CartaoCredito", back_populates="transacoes")


class Orcamento(Base):
    __tablename__ = "orcamentos"

    id = Column(Integer, primary_key=True, index=True)
    limite = Column(Float, nullable=False)
    mes_ano = Column(String, nullable=False)
    
    # Novos campos para controle de saldo reservado
    reservar_saldo = Column(Boolean, default=False)
    valor_reservado = Column(Float, default=0.0)

    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"))
    categoria_id = Column(Integer, ForeignKey("categorias.id", ondelete="CASCADE"))

    usuario = relationship("Usuario", back_populates="orcamentos")
    categoria = relationship("Categoria", back_populates="orcamentos")


class MetaEconomia(Base):
    __tablename__ = "metas_economia"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    valor_alvo = Column(Float, nullable=False)
    valor_atual = Column(Float, default=0.0)
    data_limite = Column(String, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"))

    usuario = relationship("Usuario", back_populates="metas_economia")

class CartaoCredito(Base):
    __tablename__ = "cartoes_credito"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False) # Ex: Nubank Ultravioleta, Visa Infinite
    limite = Column(Float, nullable=False)
    dia_fechamento = Column(Integer, nullable=False) # Ex: dia 25
    dia_vencimento = Column(Integer, nullable=False) # Ex: dia 2 de cada mês
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"))

    usuario = relationship("Usuario", back_populates="cartoes")
    transacoes = relationship("Transacao", back_populates="cartao", cascade="all, delete-orphan")

class ItemBancario(Base):
    __tablename__ = "itens_bancarios"

    id = Column(Integer, primary_key=True, index=True)
    pluggy_item_id = Column(String, unique=True, nullable=False) # ID do item gerado pela Pluggy
    instituicao = Column(String, nullable=False) # Ex: Nubank
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"))

    usuario = relationship("Usuario", back_populates="itens_bancarios")