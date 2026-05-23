use std::path::Path;

use lettre::{
    message::{header::ContentType, Attachment, Mailbox, Message, MultiPart, SinglePart},
    transport::smtp::authentication::Credentials,
    SmtpTransport, Transport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, specta::Type)]
pub struct SendEmailAttachment {
    pub path: String,
    pub filename: Option<String>,
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
pub struct SendEmailRequest {
    pub smtp_host: Option<String>,
    pub smtp_port: Option<u16>,
    pub smtp_starttls: Option<bool>,
    pub sender_email: String,
    pub sender_pass: String,
    pub sender_name: Option<String>,
    pub to: String,
    pub subject: String,
    pub html: String,
    pub attachments: Option<Vec<SendEmailAttachment>>,
}

#[derive(Debug, Clone, Serialize, specta::Type)]
pub struct SendEmailResponse {
    pub sent_to: String,
    pub attachment_count: u32,
}

fn infer_mime_type(path: &str, explicit: Option<&str>) -> Result<ContentType, String> {
    let mime = explicit.unwrap_or_else(|| {
        if path.to_ascii_lowercase().ends_with(".pdf") {
            "application/pdf"
        } else {
            "application/octet-stream"
        }
    });

    ContentType::parse(mime).map_err(|e| format!("Invalid attachment MIME type `{mime}`: {e}"))
}

fn build_attachment(part: &SendEmailAttachment) -> Result<SinglePart, String> {
    let bytes = std::fs::read(&part.path)
        .map_err(|e| format!("Failed to read attachment `{}`: {e}", part.path))?;
    let filename = part.filename.clone().unwrap_or_else(|| {
        Path::new(&part.path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("attachment.bin")
            .to_string()
    });
    let content_type = infer_mime_type(&part.path, part.mime_type.as_deref())?;

    Ok(Attachment::new(filename).body(bytes, content_type))
}

#[tauri::command]
#[specta::specta]
pub async fn send_email(request: SendEmailRequest) -> Result<SendEmailResponse, String> {
    if request.sender_email.trim().is_empty() {
        return Err("Sender email is required".into());
    }
    if request.sender_pass.trim().is_empty() {
        return Err("Sender password is required".into());
    }
    if request.to.trim().is_empty() {
        return Err("Recipient email is required".into());
    }
    if request.subject.trim().is_empty() {
        return Err("Email subject is required".into());
    }

    let from = Mailbox::new(
        request.sender_name.clone(),
        request
            .sender_email
            .parse()
            .map_err(|e| format!("Invalid sender email address: {e}"))?,
    );
    let to = request
        .to
        .parse()
        .map_err(|e| format!("Invalid recipient email address: {e}"))?;

    let body_part = SinglePart::builder()
        .header(ContentType::TEXT_HTML)
        .body(request.html.clone());

    let mut multipart = MultiPart::mixed().singlepart(body_part);
    let attachments = request.attachments.unwrap_or_default();
    for attachment in &attachments {
        multipart = multipart.singlepart(build_attachment(attachment)?);
    }

    let message = Message::builder()
        .from(from)
        .to(to)
        .subject(request.subject.clone())
        .multipart(multipart)
        .map_err(|e| format!("Failed to build email message: {e}"))?;

    let host = request
        .smtp_host
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("smtp.gmail.com");
    let port = request.smtp_port.unwrap_or(587);
    let use_starttls = request.smtp_starttls.unwrap_or(true);

    let transport_builder = if use_starttls {
        SmtpTransport::starttls_relay(host)
            .map_err(|e| format!("Failed to configure SMTP relay `{host}`: {e}"))?
    } else {
        SmtpTransport::relay(host)
            .map_err(|e| format!("Failed to configure SMTP relay `{host}`: {e}"))?
    };

    let mailer = transport_builder
        .port(port)
        .credentials(Credentials::new(
            request.sender_email.clone(),
            request.sender_pass.clone(),
        ))
        .build();

    let send_result = tauri::async_runtime::spawn_blocking(move || mailer.send(&message))
        .await
        .map_err(|e| format!("Failed to join SMTP task: {e}"))?;

    send_result.map_err(|e| format!("Failed to send email: {e}"))?;

    Ok(SendEmailResponse {
        sent_to: request.to,
        attachment_count: attachments.len() as u32,
    })
}
