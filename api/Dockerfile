FROM rust:1.82-slim AS builder

RUN apt-get update && \
	apt-get install -y --no-install-recommends \
		pkg-config \
		libssl-dev \
		ca-certificates \
		build-essential && \
	rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Cargo.toml Cargo.lock ./

RUN mkdir src && echo "fn main() {}" > src/main.rs && \
	cargo build --release && \
	rm -rf src

COPY src ./src

RUN cargo build --release --target x86_64-unknown-linux-gnu

FROM debian:bookworm-slim AS runtime

RUN apt-get update && \
	apt-get install -y --no-install-recommends ca-certificates openssl && \
	rm -rf /var/lib/apt/lists/* && \
	useradd -m -u 10001 appuser

WORKDIR /app

COPY --from=builder /app/target/release/x86_64-unknown-linux-gnu/azure-pricing-api /app/azure-pricing-api

USER appuser

EXPOSE 8080

CMD ["./azure-pricing-api"]
