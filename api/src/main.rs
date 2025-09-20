use actix_web::{web, App, HttpServer, middleware::Logger};
use actix_cors::Cors;
use std::env;

mod pricing;
mod handlers;

use handlers::*;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();

    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let bind_address = format!("0.0.0.0:{}", port);

    println!("Starting Azure Pricing API server on {}", bind_address);

    HttpServer::new(|| {
        App::new()
            .wrap(Logger::default())
            .wrap(
                Cors::default()
                    .allow_any_origin()
                    .allow_any_method()
                    .allow_any_header()
            )
            .route("/health", web::get().to(health_check))
            .route("/api/pricing/sql-backup/{region}", web::get().to(get_sql_backup_pricing))
            .route("/api/pricing/ltr-backup/{region}", web::get().to(get_ltr_backup_pricing))
            .route("/api/pricing/best-ltr/{region}", web::get().to(get_best_ltr_pricing))
            .route("/api/pricing/azure-backup", web::get().to(get_azure_backup_pricing))
            .route("/api/regions", web::get().to(get_available_regions))
    })
    .bind(&bind_address)?
    .run()
    .await
}
