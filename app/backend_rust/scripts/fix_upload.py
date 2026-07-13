import re

path = r'D:\\project\\rust\\CryptoPlatform\\app\\backend_rust\\src\\handlers\\user.rs'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

old_upload = '''async fn upload_document(
    State(_state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    // TODO: implement multipart upload to MinIO
    let data = DataWrapper::object(serde_json::json!({"url": "placeholder"}));
    Ok(Json(ApiResponse::ok(data)))
}'''

new_upload = '''async fn upload_document(
    State(state): State<SharedState>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    // 占位：从 JWT 获取 address，当前使用硬编码
    let owner_address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
    let storage_dir = "data/files";

    let mut saved = None;
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or("file").to_string();
        if name == "file" || name == "document" {
            let file_name = field.file_name().unwrap_or("upload.bin").to_string();
            let mime_type = field.content_type().map(|s| s.to_string());
            let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
            let media = media_repo::save_file(&state.db, owner_address, &file_name, mime_type.as_deref(), &data, storage_dir).await?;
            saved = Some(media);
            break;
        }
    }

    match saved {
        Some(media) => {
            let data = DataWrapper::object(serde_json::json!({
                "id": media.id,
                "url": format!("/api/v1/user/media/{}", media.id),
                "file_name": media.file_name,
                "file_size": media.file_size
            }));
            Ok(Json(ApiResponse::ok(data)))
        }
        None => Err(AppError::BadRequest("no file uploaded".to_string())),
    }
}

async fn download_media(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Response, AppError> {
    match media_repo::get_file_by_id(&state.db, id).await? {
        Some(media) => {
            let bytes = std::fs::read(&media.storage_path)?;
            let mut builder = Response::builder().status(StatusCode::OK);
            if let Some(mime) = &media.mime_type {
                builder = builder.header(header::CONTENT_TYPE, mime);
            }
            builder = builder.header(
                header::CONTENT_DISPOSITION,
                format!("attachment; filename=\"{}\"", media.file_name),
            );
            Ok(builder.body(Body::from(bytes)).unwrap())
        }
        None => Err(AppError::NotFound(format!("media {} not found", id))),
    }
}'''

if old_upload in text:
    text = text.replace(old_upload, new_upload)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print('upload/download replaced')
else:
    print('upload pattern not found')
