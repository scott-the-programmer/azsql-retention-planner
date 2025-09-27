FROM rust:1.82-slim AS builder
ARG TARGETARCH

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

RUN set -eux; \
		case "$TARGETARCH" in \
			amd64) RUST_TARGET=x86_64-unknown-linux-gnu ;; \
			arm64) RUST_TARGET=aarch64-unknown-linux-gnu ;; \
			*) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1 ;; \
		esac; \
		echo "Building for $RUST_TARGET"; \
		cargo build --release --target "$RUST_TARGET"; \
		cp "target/$RUST_TARGET/release/azure-pricing-api" /app/azure-pricing-api

FROM debian:bookworm-slim AS runtime

RUN apt-get update && \
	apt-get install -y --no-install-recommends ca-certificates openssl && \
	rm -rf /var/lib/apt/lists/* && \
	useradd -m -u 10001 appuser

WORKDIR /app

COPY --from=builder /app/azure-pricing-api /app/azure-pricing-api

USER appuser

EXPOSE 8080

CMD ["./azure-pricing-api"]
