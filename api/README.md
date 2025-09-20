# Azure Pricing API

A simple Rust API that wraps Azure's pricing API for easier access to SQL Database backup storage pricing. 

Used to power https://azsqlretention.term.nz

## API Endpoints

### Health Check

```
GET /health
```

### SQL Backup Storage Pricing

```
GET /api/pricing/sql-backup/{region}
```

Example: `GET /api/pricing/sql-backup/eastus`

### LTR Backup Storage Pricing

```
GET /api/pricing/ltr-backup/{region}
```

Example: `GET /api/pricing/ltr-backup/eastus`

### Best LTR Pricing

```
GET /api/pricing/best-ltr/{region}
```

Example: `GET /api/pricing/best-ltr/eastus`

Returns the most appropriate LTR pricing (preferring LRS if available).

### Azure Backup Pricing

```
GET /api/pricing/azure-backup?service={service}&meter_suffix={suffix}&region={region}
```

Example: `GET /api/pricing/azure-backup?service=Backup&meter_suffix=LRS&region=eastus`

### Available Regions

```
GET /api/regions
```

## Running the API

### Development

```bash
cd api
cargo run
```

### Production

```bash
cd api
cargo build --release
./target/release/azure-pricing-api
```
