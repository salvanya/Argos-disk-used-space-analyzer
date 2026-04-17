"""Application configuration loaded from environment variables.

All settings are optional with sensible defaults. Prefix: ``ARGOS_``.
"""

from __future__ import annotations

from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="ARGOS_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = "127.0.0.1"
    port: int = 0  # 0 = OS picks a free port
    auto_open_browser: bool = True
    cache_db: str = "cache.sqlite"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    include_hidden: bool = False
    dev: bool = False  # True when running Vite dev server alongside

    @field_validator("host")
    @classmethod
    def host_must_be_localhost(cls, v: str) -> str:
        if not v:
            raise ValueError("host must not be empty")
        if v == "0.0.0.0":
            raise ValueError(
                "Binding to 0.0.0.0 is not allowed. Argos binds to 127.0.0.1 only."
            )
        return v
