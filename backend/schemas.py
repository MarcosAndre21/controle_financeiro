# Arquivo: backend/schemas.py
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Union
from enum import Enum

class TipoTransacao(str, Enum):
    ENTRADA = "entrada"
    SAIDA = "saida"

# ==========================================
# SCHEMAS DE CONTAS (Instituições)
# ==========================================
class ContaBase(BaseModel):
    nome: str
    instituicao: Optional[str] = None
    saldo_inicial: float = 0.0

class ContaCreate(ContaBase):
    pass

class ContaResponse(ContaBase):
    id: int
    usuario_id: int

    class Config:
        from_attributes = True

# ==========================================
# SCHEMAS DE USUÁRIOS E AUTENTICAÇÃO
# ==========================================
class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr

class UsuarioCreate(BaseModel):
    nome: str
    email: str
    senha: str
    p1: str
    r1: str
    p2: str
    r2: str
    p3: str
    r3: str

class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email: str
    data_criacao: Optional[datetime] = None
    contas: List[ContaResponse] = []

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    usuario_id: int
    nome: str

class LoginRequest(BaseModel):
    email: EmailStr
    senha: str

class ValidarPerguntasRequest(BaseModel):
    email: str
    r1: str
    r2: str
    r3: str

class RedefinirSenhaRequest(BaseModel):
    email: str
    nova_senha: str

class AlterarSenhaLogadoRequest(BaseModel):
    senha_atual: str
    nova_senha: str

# ==========================================
# SCHEMAS DE CATEGORIAS
# ==========================================
class CategoriaBase(BaseModel):
    nome: str
    tipo: TipoTransacao

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaResponse(CategoriaBase):
    id: int
    usuario_id: int

    class Config:
        from_attributes = True

# ==========================================
# SCHEMAS DE ORÇAMENTOS (Atualizados com Reserva de Saldo)
# ==========================================
class OrcamentoCreate(BaseModel):
    limite: float
    mes_ano: str
    categoria_id: int
    reservar_saldo: Optional[bool] = False
    valor_reservado: Optional[float] = 0.0

class OrcamentoUpdate(BaseModel):
    limite: Optional[float] = None
    mes_ano: Optional[str] = None
    categoria_id: Optional[int] = None
    reservar_saldo: Optional[bool] = None
    valor_reservado: Optional[float] = None

class OrcamentoResponse(BaseModel):
    id: int
    limite: float
    mes_ano: str
    categoria_id: int
    usuario_id: int
    reservar_saldo: Optional[bool] = False
    valor_reservado: Optional[float] = 0.0

    class Config:
        from_attributes = True

# ==========================================
# SCHEMAS DE METAS DE ECONOMIA
# ==========================================
class MetaEconomiaCreate(BaseModel):
    titulo: str
    valor_alvo: float
    valor_atual: float = 0.0
    data_limite: Optional[str] = None

class MetaEconomiaResponse(BaseModel):
    id: int
    titulo: str
    valor_alvo: float
    valor_atual: float
    data_limite: Optional[str] = None
    usuario_id: int

    class Config:
        from_attributes = True

# ==========================================
# SCHEMAS DE TRANSAÇÕES
# ==========================================
class TransacaoCreate(BaseModel):
    descricao: str
    valor: float
    tipo: str
    data_transacao: str
    pago: Optional[bool] = True
    conta_id: int
    categoria_id: Optional[int] = None
    cartao_id: Optional[int] = None
    forma_pagamento: Optional[str] = "debito"
    recorrente: Optional[bool] = False
    parcelado: Optional[bool] = False
    parcela_atual: Optional[int] = None
    total_parcelas: Optional[int] = None

class TransacaoResponse(BaseModel):
    id: int
    descricao: str
    valor: float
    tipo: str
    data_transacao: Union[str, datetime]
    pago: bool = True
    conta_id: int
    categoria_id: Optional[int] = None
    cartao_id: Optional[int] = None
    forma_pagamento: Optional[str] = "debito"
    recorrente: Optional[bool] = False
    parcelado: Optional[bool] = False
    parcela_atual: Optional[int] = None
    total_parcelas: Optional[int] = None

    class Config:
        from_attributes = True

# ==========================================
# SCHEMAS DE CARTÕES DE CRÉDITO
# ==========================================
class CartaoCreate(BaseModel):
    nome: str
    limite: float
    dia_fechamento: int
    dia_vencimento: int

class CartaoResponse(CartaoCreate):
    id: int
    usuario_id: int

    class Config:
        from_attributes = True