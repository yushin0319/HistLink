"""Admin API schemas"""
from pydantic import BaseModel


class TermBase(BaseModel):
    name: str
    category: str
    description: str = ""
    tier: int = 1


class TermCreate(TermBase):
    pass


class TermUpdate(TermBase):
    pass


class TermResponse(TermBase):
    id: int

    class Config:
        from_attributes = True


class EdgeBase(BaseModel):
    from_term_id: int
    to_term_id: int
    keyword: str = ""
    description: str = ""
    difficulty: str = "normal"


class EdgeCreate(EdgeBase):
    pass


class EdgeUpdate(EdgeBase):
    pass


class EdgeResponse(BaseModel):
    id: int
    from_term_id: int
    to_term_id: int
    from_term_name: str
    to_term_name: str
    keyword: str
    description: str
    difficulty: str

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    items: list
    total: int
