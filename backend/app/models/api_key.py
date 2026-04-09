from sqlmodel import SQLModel, Field
from datetime import datetime
import uuid
import base64
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# Encryption key derived from environment
_encryption_key = None


def _get_fernet():
    global _encryption_key
    if _encryption_key is None:
        secret = os.getenv("ENCRYPTION_SECRET", "dev-secret-key-change-in-prod")
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"tokenscope-salt-v1",
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(secret.encode()))
        _encryption_key = Fernet(key)
    return _encryption_key


def encrypt_key(plain_key: str) -> str:
    """Encrypt an API key."""
    f = _get_fernet()
    return f.encrypt(plain_key.encode()).decode()


def decrypt_key(encrypted_key: str) -> str:
    """Decrypt an API key."""
    f = _get_fernet()
    return f.decrypt(encrypted_key.encode()).decode()


class APIKey(SQLModel, table=True):
    __tablename__ = "api_keys"

    id: str = Field(primary_key=True, default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(index=True)
    provider: str = Field()  # openai | anthropic | gemini

    # Encrypted API key (never stored in plain text)
    encrypted_key: str = Field()

    key_label: str = Field(default=None)
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def key_last4(self) -> str:
        try:
            decrypted = decrypt_key(self.encrypted_key)
            return decrypted[-4:]
        except Exception:
            return "****"

    def get_decrypted_key(self) -> str:
        return decrypt_key(self.encrypted_key)
