FROM rust:1.82-alpine AS builder

WORKDIR /app

RUN apk add --no-cache musl-dev openssl-dev pkgconfig openssl openssl-libs-static

COPY Cargo.toml Cargo.lock ./

RUN mkdir src && echo "fn main() {}" > src/main.rs

RUN rustup target add aarch64-unknown-linux-musl && \
	cargo build --release && rm -rf src

COPY src ./src

RUN cargo build --release --target aarch64-unknown-linux-musl

FROM alpine:latest

RUN apk add --no-cache ca-certificates openssl openssl-libs-static

WORKDIR /app

COPY --from=builder /app/target/aarch64-unknown-linux-musl/release/azure-pricing-api /app/azure-pricing-api

EXPOSE 8080

CMD ["./azure-pricing-api"]
