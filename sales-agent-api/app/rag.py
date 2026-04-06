"""
FAISS + OpenAI embeddings RAG over knowledge/company.txt.

Loads once (lazy), thread-safe. Use get_context(question) before chat completion.
"""

from __future__ import annotations

import logging
import threading
from pathlib import Path

from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_vector_store: FAISS | None = None


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _knowledge_path(settings: Settings) -> Path:
    p = Path(settings.knowledge_file)
    if p.is_absolute():
        return p
    return _project_root() / p


def _build_vector_store(settings: Settings) -> FAISS:
    path = _knowledge_path(settings)
    if not path.is_file():
        raise FileNotFoundError(f"Knowledge file not found: {path}")

    raw = path.read_text(encoding="utf-8")
    if not raw.strip():
        raise ValueError(f"Knowledge file is empty: {path}")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.rag_chunk_size,
        chunk_overlap=settings.rag_chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.create_documents([raw])

    embeddings = OpenAIEmbeddings(
        api_key=settings.openai_api_key,
        model=settings.openai_embedding_model,
    )
    logger.info(
        "Building FAISS index: %s chunks from %s",
        len(chunks),
        path,
    )
    return FAISS.from_documents(chunks, embeddings)


def load_vector_store() -> None:
    """
    Eagerly build the FAISS index (call from FastAPI lifespan).
    Safe to call multiple times; builds only once.
    """
    ensure_vector_store()


def ensure_vector_store() -> FAISS:
    """Thread-safe lazy initialization of the in-memory FAISS store."""
    global _vector_store
    if _vector_store is not None:
        return _vector_store
    with _lock:
        if _vector_store is None:
            settings = get_settings()
            _vector_store = _build_vector_store(settings)
    return _vector_store


def get_context(question: str, k: int | None = None) -> str:
    """
    Retrieve top-k similar chunks from the company knowledge base for the question.

    Returns joined text for injection into the chat prompt. Empty string if nothing found.
    """
    settings = get_settings()
    k = k if k is not None else settings.rag_top_k
    store = ensure_vector_store()
    docs = store.similarity_search(question.strip(), k=k)
    if not docs:
        return ""
    return "\n\n---\n\n".join(d.page_content for d in docs)


def reset_vector_store_for_tests() -> None:
    """Clear cached store (tests only)."""
    global _vector_store
    with _lock:
        _vector_store = None
