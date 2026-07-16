**IaaS - Minimum Platform Requirements (MPR)**

**1. Compute & Runtime Requirements**

**1.1 Core Compute**

* **Must Have**
* Containerized workloads (Docker) as first-class citizen
* Support for:
  + Node.js backend services
  + Python AI/ML services
* Horizontal scaling (stateless services)
* Autoscaling based on CPU + request count
* **Forward-Looking (Critical)**
* Separate compute pools for:
  + API traffic
  + Real-time services (WebSocket)
  + AI/ML inference jobs
* Burst capacity for:
  + Meet days (traffic spikes)
  + End-of-week logging surges
* CPU pinning / resource isolation (AI jobs must not starve API)

**2. Networking & Traffic Management**

**2.1 Ingress & Routing**

* **Must Have**
* HTTPS termination (TLS 1.2+)
* Layer 7 load balancing
* Path-based routing (/api, /ai, /realtime)
* WebSocket support
* **Forward-Looking**
* Global Anycast or regional routing
* Sticky sessions support (chat + live dashboards)
* Rate limiting per:
  + Team
  + User
  + API token (Enterprise tier)

**3. Data Layer Infrastructure**

**3.1 Primary Database (PostgreSQL)**

* **Must Have**
* Managed PostgreSQL
* Automated backups (daily minimum)
* Point-in-time recovery
* Read replicas
* **Forward-Looking**
* Multi-AZ high availability
* Logical replication for:
  + Analytics
  + AI feature extraction
* Per-tenant logical isolation (Enterprise readiness)

**3.2 Caching & Real-Time**

* **Must Have**
* Managed Redis
* Pub/Sub support
* Session storage
* **Forward-Looking**
* Redis clustering
* Separate cache namespaces per team
* Graceful cache eviction policies (AI + analytics heavy)

**4. Storage & Media Handling**

**4.1 Object Storage**

* **Must Have**
* S3-compatible object storage
* Private buckets
* Signed URL access
* Lifecycle rules (auto-archive/delete)
* **Forward-Looking**
* Media transcoding pipeline (video analysis)
* CDN-backed delivery for:
  + Videos
  + Images
* Per-team storage quotas (billing control)

**5. AI / ML Infrastructure**

**5.1 AI Compute**

* **Must Have**
* Isolated AI service runtime
* Async job execution (queue-based)
* Ability to call external APIs (OpenAI, Anthropic)
* **Forward-Looking (Very Important)**
* GPU-optional nodes (future predictive models)
* Vector database support (Pinecone / Weaviate)
* Model versioning & rollback
* Feature store readiness (historical training data)

**5.2 Job Orchestration**

* **Must Have**
  + Background job queue (BullMQ / equivalent)
  + Retry + dead-letter queues
* **Forward-Looking**
* Priority queues:
  + Real-time alerts > analytics > batch insights
* Cost guards for AI API usage
* Job throttling per subscription tier

**6. Security & Compliance (Non-Negotiable)**

**6.1 Identity & Access**

* **Must Have**
* IAM with least-privilege policies
* Secret management (no env files in repos)
* Encrypted credentials at rest
* **Forward-Looking**
* Fine-grained service-to-service auth
* Per-tenant encryption keys (Enterprise)
* SSO / SAML readiness

**6.2 Data Protection**

* **Must Have**
* Encryption at rest (AES-256)
* Encryption in transit
* Secure backups
* **Forward-Looking**
* FERPA-aligned data handling
* SOC 2 audit readiness
* Audit logs (immutable)
* Data residency controls (international expansion)

**7. Observability & Reliability**

**7.1 Monitoring**

* **Must Have**
* Metrics: CPU, memory, DB connections
* Error tracking (API + frontend)
* Log aggregation
* **Forward-Looking**
* Business-level metrics:
  + Workouts logged per hour
  + AI jobs per team
* Per-tenant performance visibility
* Anomaly detection (infra + app)

**7.2 Reliability Targets**

* **Must Have**
* ≥ 99.5% uptime target (MVP)
* Graceful degradation (AI failures ≠ app down)
* **Forward-Looking**
* 99.9% SLA (Enterprise)
* Multi-region failover
* Read-only mode during incidents

**8. CI/CD & Deployment**

**8.1 Deployment Pipeline**

* **Must Have**
* Automated builds
* Environment separation (dev / staging / prod)
* Rollback capability
* **Forward-Looking**
* Blue-green or canary deployments
* Feature flag infrastructure
* Per-team feature gating

**9. Scalability & Multi-Tenancy**

**9.1 Tenant Architecture**

* **Must Have**
* Team-scoped data access
* Hard authorization boundaries
* **Forward-Looking**
* Soft multi-tenancy → hard isolation option
* Enterprise "dedicated environment" support
* Conference-wide deployments

**10. Cost Control & Financial Safety**

**10.1 Cost Governance**

* **Must Have**
* Resource usage visibility
* Budget alerts
* **Forward-Looking**
* Cost attribution per team
* AI usage quotas per tier
* Automatic throttling when limits reached
* Margin protection on AI analytics

**11. Disaster Recovery & Business Continuity**

* **Must Have**
* Automated backups
* Restore testing
* **Forward-Looking**
* Defined RTO / RPO targets
* Cross-region backup replication
* Incident runbooks
* Customer communication pipeline

**Summary: Hidden but Critical Requirements**

These are **not obvious in the docs**, but are **essential for success**:

1. **AI cost isolation** (or margins will collapse)
2. **Tenant-aware infrastructure** (future enterprise deals depend on it)
3. **Graceful AI degradation** (AI must never be a single point of failure)
4. **Observability beyond CPU** (you must see *coaching behavior*, not just servers)
5. **Compliance readiness early** (FERPA + SOC 2 will be asked in sales calls)
6. **Meet-day traffic spikes planning** (this is your Black Friday)
