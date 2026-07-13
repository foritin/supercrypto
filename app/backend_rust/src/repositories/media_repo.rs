use crate::error::AppError;
use crate::models::media_file::MediaFile;
use sqlx::SqlitePool;
use uuid::Uuid;

/// 保存上传文件到本地磁盘，并在 media_files 表中记录元数据
pub async fn save_file(
    pool: &SqlitePool,
    owner_address: &str,
    file_name: &str,
    mime_type: Option<&str>,
    file_bytes: &[u8],
    storage_dir: &str,
) -> Result<MediaFile, AppError> {
    std::fs::create_dir_all(storage_dir)?;

    let file_id = Uuid::new_v4().to_string();
    let ext = std::path::Path::new(file_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("bin");
    let storage_name = format!("{}.{}", file_id, ext);
    let storage_path = format!("{}/{}", storage_dir.trim_end_matches('/'), storage_name);
    std::fs::write(&storage_path, file_bytes)?;

    let file_size = file_bytes.len() as i64;
    let mime = mime_type.map(|s| s.to_string());

    let row = sqlx::query_as!(
        MediaFile,
        r#"
        INSERT INTO media_files (owner_address, file_name, storage_path, file_size, mime_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, owner_address, file_name, storage_path, file_size, mime_type, created_at
        "#,
        owner_address,
        file_name,
        storage_path,
        file_size,
        mime
    )
    .fetch_one(pool)
    .await?;

    Ok(row)
}

pub async fn get_file_by_id(pool: &SqlitePool, id: i64) -> Result<Option<MediaFile>, AppError> {
    let row = sqlx::query_as!(
        MediaFile,
        "SELECT id, owner_address, file_name, storage_path, file_size, mime_type, created_at FROM media_files WHERE id = $1",
        id
    )
    .fetch_optional(pool)
    .await?;
    Ok(row)
}
