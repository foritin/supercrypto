"""
媒体文件模型

记录本地文件系统中上传的文件元信息，与 Rust 后端的 media_files 表对齐。
用于 KYC 文档、用户上传文件等非资产类文件追踪。
"""

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin


class MediaFile(AbstractModel, TimestampMixin):
    """
    媒体文件记录表

    存储上传文件的元信息（文件名、存储路径、大小、MIME 类型等）。
    owner_address 标识文件所有者钱包地址。
    """

    owner_address = fields.CharField(max_length=128, description="所有者钱包地址")
    file_name = fields.CharField(max_length=255, description="原始文件名")
    storage_path = fields.CharField(max_length=500, description="本地存储路径")
    file_size = fields.IntField(default=0, description="文件大小(字节)")
    mime_type = fields.CharField(max_length=100, null=True, description="MIME 类型")

    class Meta:
        table = "media_files"
        indexes = [("owner_address",)]

    def __str__(self):
        return f"MediaFile({self.file_name}, owner={self.owner_address})"
