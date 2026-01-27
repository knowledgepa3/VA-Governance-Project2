# MAI Pattern Visual Diagrams

This document contains visual representations of the MAI Classification System for use in presentations, documentation, and publications.

---

## Diagram 1: MAI Classification Overview

```mermaid
graph TB
    subgraph "MAI Classification System"
        direction TB

        MANDATORY[<b>MANDATORY</b><br/>High Risk<br/>Human MUST approve]
        ADVISORY[<b>ADVISORY</b><br/>Medium Risk<br/>Human SHOULD review]
        INFORMATIONAL[<b>INFORMATIONAL</b><br/>Low Risk<br/>Auto-proceed + log]

        style MANDATORY fill:#dc2626,stroke:#991b1b,stroke-width:3px,color:#fff
        style ADVISORY fill:#f59e0b,stroke:#d97706,stroke-width:3px,color:#000
        style INFORMATIONAL fill:#3b82f6,stroke:#1d4ed8,stroke-width:3px,color:#fff
    end

    subgraph "Decision Criteria"
        direction TB

        PII[PII/PHI Handling]
        IRREV[Irreversible Actions]
        LEGAL[Legal/Financial Decisions]
        COMPLIANCE[Compliance Liability]
        ANALYSIS[Informational Analysis]

        PII --> MANDATORY
        IRREV --> MANDATORY
        LEGAL --> MANDATORY
        COMPLIANCE --> ADVISORY
        ANALYSIS --> INFORMATIONAL
    end

    subgraph "Enforcement"
        direction TB

        BLOCK[Workflow BLOCKS<br/>until approved]
        NOTIFY[Notify reviewer<br/>Auto-proceed after timeout]
        LOG[Log and continue<br/>No human needed]

        MANDATORY --> BLOCK
        ADVISORY --> NOTIFY
        INFORMATIONAL --> LOG
    end

    subgraph "Audit Trail"
        direction TB

        ALL[ALL classifications<br/>logged with full context]

        BLOCK --> ALL
        NOTIFY --> ALL
        LOG --> ALL
    end
```

---

## Diagram 2: Workflow Execution with MAI Gates

```mermaid
sequenceDiagram
    participant User
    participant Orchestrator
    participant Agent1 as Agent 1<br/>(INFORMATIONAL)
    participant Agent2 as Agent 2<br/>(MANDATORY)
    participant Human as Human Reviewer
    participant Agent3 as Agent 3<br/>(ADVISORY)
    participant AuditLog as Audit Log

    User->>Orchestrator: Start Workflow

    Note over Orchestrator: Execute Agent 1
    Orchestrator->>Agent1: Run with input
    Agent1-->>Orchestrator: Output
    Orchestrator->>AuditLog: Log (status: AUTO_APPROVED)

    Note over Orchestrator,Human: MANDATORY Gate
    Orchestrator->>Agent2: Run with input
    Agent2-->>Orchestrator: Output
    Orchestrator->>AuditLog: Log (status: PENDING_REVIEW)
    Orchestrator->>Human: Request Approval

    Note over Human: Reviews output<br/>Makes decision

    alt Approved
        Human-->>Orchestrator: APPROVE
        Orchestrator->>AuditLog: Update (status: APPROVED)
        Note over Orchestrator: Continue workflow
    else Rejected
        Human-->>Orchestrator: REJECT
        Orchestrator->>AuditLog: Update (status: REJECTED)
        Note over Orchestrator: Halt or retry
    end

    Note over Orchestrator,Human: ADVISORY Gate
    Orchestrator->>Agent3: Run with input
    Agent3-->>Orchestrator: Output
    Orchestrator->>AuditLog: Log (status: PENDING_REVIEW)
    Orchestrator->>Human: Notify (optional review)

    Note over Human: 30 second timeout

    alt Human reviews in time
        Human-->>Orchestrator: APPROVE/REJECT
        Orchestrator->>AuditLog: Update (status: APPROVED/REJECTED)
    else Timeout
        Orchestrator->>AuditLog: Update (status: AUTO_APPROVED)
        Note over Orchestrator: Auto-proceed
    end

    Orchestrator-->>User: Workflow Complete
```

---

## Diagram 3: Agent Classification Decision Tree

```mermaid
flowchart TD
    Start([New Agent]) --> Q1{Can cause<br/>irreversible harm?}

    Q1 -->|Yes| Q1A{Compensating<br/>control exists?}
    Q1A -->|No| M1[MANDATORY]
    Q1A -->|Yes| Q2
    Q1 -->|No| Q2

    Q2{Handles PII/PHI/CUI?} -->|Yes| Q2A{Redaction/<br/>sanitization<br/>applied?}
    Q2A -->|No| M2[MANDATORY]
    Q2A -->|Yes| A1[ADVISORY]
    Q2 -->|No| Q3

    Q3{Makes legal/<br/>financial<br/>decisions?} -->|Yes| M3[MANDATORY]
    Q3 -->|No| Q4

    Q4{Creates<br/>compliance<br/>liability?} -->|Yes| A2[ADVISORY]
    Q4 -->|No| Q5

    Q5{Informs later<br/>decisions?} -->|Yes| A3[ADVISORY]
    Q5 -->|No| I1[INFORMATIONAL]

    style M1 fill:#dc2626,stroke:#991b1b,color:#fff,stroke-width:3px
    style M2 fill:#dc2626,stroke:#991b1b,color:#fff,stroke-width:3px
    style M3 fill:#dc2626,stroke:#991b1b,color:#fff,stroke-width:3px
    style A1 fill:#f59e0b,stroke:#d97706,color:#000,stroke-width:3px
    style A2 fill:#f59e0b,stroke:#d97706,color:#000,stroke-width:3px
    style A3 fill:#f59e0b,stroke:#d97706,color:#000,stroke-width:3px
    style I1 fill:#3b82f6,stroke:#1d4ed8,color:#fff,stroke-width:3px
```

---

## Diagram 4: VA Claims Workflow with MAI Classifications

```mermaid
flowchart LR
    subgraph Input
        Files[Medical/Legal<br/>Documents]
    end

    subgraph Agents
        direction TB

        A1[Unified Gateway<br/>PII Redaction]
        A2[Document Intake<br/>File Organization]
        A3[Timeline Builder<br/>Chronology]
        A4[Evidence Validator<br/>38 CFR Mapping]
        A5[C&P Examiner<br/>Clinical Lens]
        A6[Quality Assurance<br/>Logic Check]
        A7[Report Generator<br/>Final Output]
        A8[Telemetry<br/>Compliance Metrics]

        A1 -.->|MANDATORY Gate| H1{Human<br/>Approval}
        H1 -->|Approved| A2

        A2 --> A3

        A3 --> A4
        A4 -.->|ADVISORY Gate| H2{Human<br/>Review?}
        H2 -->|Reviewed/Timeout| A5

        A5 -.->|ADVISORY Gate| H3{Human<br/>Review?}
        H3 -->|Reviewed/Timeout| A6

        A6 -.->|ADVISORY Gate| H4{Human<br/>Review?}
        H4 -->|Reviewed/Timeout| A7

        A7 -.->|MANDATORY Gate| H5{Human<br/>Approval}
        H5 -->|Approved| A8
    end

    subgraph Output
        Report[Evidence Chain<br/>Validation Report]
        Audit[Audit Trail<br/>CMMC Dashboard]
    end

    Files --> A1
    A8 --> Report
    A8 --> Audit

    style A1 fill:#dc2626,stroke:#991b1b,color:#fff,stroke-width:2px
    style A7 fill:#dc2626,stroke:#991b1b,color:#fff,stroke-width:2px
    style A4 fill:#f59e0b,stroke:#d97706,color:#000,stroke-width:2px
    style A5 fill:#f59e0b,stroke:#d97706,color:#000,stroke-width:2px
    style A6 fill:#f59e0b,stroke:#d97706,color:#000,stroke-width:2px
    style A2 fill:#3b82f6,stroke:#1d4ed8,color:#fff,stroke-width:2px
    style A3 fill:#3b82f6,stroke:#1d4ed8,color:#fff,stroke-width:2px
    style A8 fill:#3b82f6,stroke:#1d4ed8,color:#fff,stroke-width:2px

    style H1 fill:#fecaca,stroke:#991b1b
    style H5 fill:#fecaca,stroke:#991b1b
    style H2 fill:#fed7aa,stroke:#d97706
    style H3 fill:#fed7aa,stroke:#d97706
    style H4 fill:#fed7aa,stroke:#d97706
```

---

## Diagram 5: Comparison - Before vs After MAI

```mermaid
flowchart TB
    subgraph Before["❌ Before MAI (Ungoverned)"]
        direction TB
        B1[Agent 1] --> B2[Agent 2] --> B3[Agent 3] --> B4[Agent 4]
        B4 --> BOut[Unverified Output]

        BNote[No gates<br/>No classifications<br/>No oversight<br/>Post-hoc logging only]

        style B1 fill:#6b7280,stroke:#374151,color:#fff
        style B2 fill:#6b7280,stroke:#374151,color:#fff
        style B3 fill:#6b7280,stroke:#374151,color:#fff
        style B4 fill:#6b7280,stroke:#374151,color:#fff
        style BOut fill:#ef4444,stroke:#991b1b,color:#fff
        style BNote fill:#fee,stroke:#fcc,color:#000
    end

    subgraph After["✅ After MAI (Governed)"]
        direction TB
        A1[Agent 1<br/>MANDATORY] -.-> G1{Gate}
        G1 --> A2[Agent 2<br/>INFORMATIONAL]
        A2 --> A3[Agent 3<br/>ADVISORY] -.-> G2{Gate}
        G2 --> A4[Agent 4<br/>MANDATORY] -.-> G3{Gate}
        G3 --> AOut[Verified Output]

        ANote[Risk-based gates<br/>Human oversight<br/>Full audit trail<br/>Compliance ready]

        style A1 fill:#dc2626,stroke:#991b1b,color:#fff
        style A2 fill:#3b82f6,stroke:#1d4ed8,color:#fff
        style A3 fill:#f59e0b,stroke:#d97706,color:#000
        style A4 fill:#dc2626,stroke:#991b1b,color:#fff
        style AOut fill:#10b981,stroke:#059669,color:#fff
        style ANote fill:#d1fae5,stroke:#a7f3d0,color:#000
        style G1 fill:#fecaca,stroke:#991b1b
        style G2 fill:#fed7aa,stroke:#d97706
        style G3 fill:#fecaca,stroke:#991b1b
    end
```

---

## Diagram 6: MAI System Architecture

```mermaid
graph TB
    subgraph "Developer Layer"
        Dev[Developer] -->|Defines agents<br/>with MAI classifications| Config[Agent Configs]
    end

    subgraph "Orchestration Layer"
        Config --> Engine[Workflow Engine]
        Engine -->|Check classification| Router{Classification<br/>Router}

        Router -->|MANDATORY| MB[Blocking Gate]
        Router -->|ADVISORY| AB[Advisory Gate]
        Router -->|INFORMATIONAL| IB[Auto-Proceed]
    end

    subgraph "Approval Layer"
        MB -->|Request approval| RBAC[RBAC System]
        AB -->|Notify reviewers| RBAC

        RBAC -->|Check permissions| Approvers[(Approved<br/>User Roles)]
        Approvers -->|ISSO| MB
        Approvers -->|SME| MB
        Approvers -->|SME| AB
    end

    subgraph "Audit Layer"
        MB -->|Log decision| AuditDB[(Audit<br/>Database)]
        AB -->|Log decision| AuditDB
        IB -->|Log action| AuditDB

        AuditDB -->|Generate| Reports[Compliance<br/>Reports]
    end

    subgraph "Output Layer"
        MB -->|Approved| Next[Next Agent]
        AB -->|Reviewed/Timeout| Next
        IB --> Next

        Reports --> NIST[NIST AI RMF]
        Reports --> CMMC[CMMC 2.0]
        Reports --> Export[Audit Export]
    end

    style Config fill:#e0e7ff,stroke:#6366f1
    style Engine fill:#dbeafe,stroke:#3b82f6
    style Router fill:#fef3c7,stroke:#f59e0b
    style MB fill:#fecaca,stroke:#dc2626
    style AB fill:#fed7aa,stroke:#f59e0b
    style IB fill:#bfdbfe,stroke:#3b82f6
    style RBAC fill:#e0e7ff,stroke:#6366f1
    style AuditDB fill:#d1d5db,stroke:#6b7280
    style Reports fill:#d1fae5,stroke:#10b981
```

---

## ASCII Art Version (For Plain Text)

```
┌─────────────────────────────────────────────────────────────────┐
│                  MAI CLASSIFICATION SYSTEM                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                           │
│  │   MANDATORY     │  ← High Risk                              │
│  │  Human MUST     │    • PII/PHI handling                     │
│  │   approve       │    • Irreversible actions                 │
│  └────────┬────────┘    • Legal/financial decisions            │
│           │                                                     │
│           ├─→ Workflow BLOCKS until approved                   │
│           └─→ Full audit trail with reviewer ID                │
│                                                                 │
│  ┌─────────────────┐                                           │
│  │    ADVISORY     │  ← Medium Risk                            │
│  │  Human SHOULD   │    • Compliance liability                 │
│  │   review        │    • Contextual judgments                 │
│  └────────┬────────┘    • Quality assurance                    │
│           │                                                     │
│           ├─→ Notify reviewer, auto-proceed after timeout      │
│           └─→ Full audit trail (approved/auto-approved)        │
│                                                                 │
│  ┌─────────────────┐                                           │
│  │ INFORMATIONAL   │  ← Low Risk                               │
│  │ Auto-proceed    │    • Data gathering                       │
│  │   with log      │    • File organization                    │
│  └────────┬────────┘    • Timeline construction                │
│           │                                                     │
│           ├─→ Continue immediately                             │
│           └─→ Full audit trail (auto-approved)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Diagram 7: Risk → Classification Mapping

```
Risk Assessment Matrix:

                        │ Low Impact │ Med Impact │ High Impact │
                        ├────────────┼────────────┼─────────────┤
Impossible to Occur     │     I      │     I      │      A      │
                        ├────────────┼────────────┼─────────────┤
Unlikely to Occur       │     I      │     A      │      A      │
                        ├────────────┼────────────┼─────────────┤
Likely to Occur         │     A      │     A      │      M      │
                        ├────────────┼────────────┼─────────────┤
Almost Certain          │     A      │     M      │      M      │
                        └────────────┴────────────┴─────────────┘

Legend:
  I = INFORMATIONAL (auto-proceed + log)
  A = ADVISORY (notify + optional review)
  M = MANDATORY (human must approve)
```

---

## Diagram 8: Approval Flow State Machine

```mermaid
stateDiagram-v2
    [*] --> AgentExecuting: Start Agent

    AgentExecuting --> CheckClassification: Agent Completes

    CheckClassification --> MANDATORY_Gate: if MANDATORY
    CheckClassification --> ADVISORY_Gate: if ADVISORY
    CheckClassification --> INFORMATIONAL_Log: if INFORMATIONAL

    MANDATORY_Gate --> PendingApproval: Request Human Review
    PendingApproval --> Approved: Human approves
    PendingApproval --> Rejected: Human rejects

    ADVISORY_Gate --> PendingOptionalReview: Notify Reviewers
    PendingOptionalReview --> Reviewed: Human reviews
    PendingOptionalReview --> AutoApproved: Timeout (30s)

    INFORMATIONAL_Log --> AutoApproved: Log and Continue

    Approved --> LogApproved: Update Audit Log
    Rejected --> LogRejected: Update Audit Log
    Reviewed --> LogReviewed: Update Audit Log
    AutoApproved --> LogAutoApproved: Update Audit Log

    LogApproved --> NextAgent: Continue Workflow
    LogRejected --> RetryOrHalt: Handle Rejection
    LogReviewed --> NextAgent: Continue Workflow
    LogAutoApproved --> NextAgent: Continue Workflow

    NextAgent --> [*]: Workflow Complete
    RetryOrHalt --> [*]: Workflow Halted
```

---

## Usage Guidelines

### For Presentations (PowerPoint/Google Slides)
- Use **Diagram 1** for overview/introduction
- Use **Diagram 3** for explaining how to classify agents
- Use **Diagram 5** for before/after comparison

### For Documentation
- Use **Diagram 2** for technical workflow explanation
- Use **Diagram 4** for real-world example (VA Claims)
- Use **Diagram 6** for system architecture

### For GitHub README
- All Mermaid diagrams render automatically
- Use **Diagram 1, 4, 5** for visual appeal

### For Academic Papers
- Use **Diagram 3** (decision tree) in methodology
- Use **Diagram 8** (state machine) for formal specification
- Include ASCII art version for accessibility

### For Blog Posts/Medium
- Use **Diagram 5** (before/after) for engagement
- Use **Diagram 1** for quick understanding
- Screenshot and annotate diagrams for clarity

---

## Diagram Color Scheme

**MANDATORY:** 🔴 Red (#dc2626)
- Conveys "stop, human required"
- High urgency, critical decision

**ADVISORY:** 🟠 Amber/Orange (#f59e0b)
- Conveys "caution, review recommended"
- Medium priority, important but not blocking

**INFORMATIONAL:** 🔵 Blue (#3b82f6)
- Conveys "information, proceeding"
- Low priority, routine operation

**Approved/Success:** 🟢 Green (#10b981)
**Rejected/Danger:** 🔴 Red (#ef4444)
**Neutral/System:** ⚪ Gray (#6b7280)

---

## Exporting Diagrams

### As PNG (for presentations)
1. Copy Mermaid code
2. Paste into https://mermaid.live/
3. Export as PNG/SVG
4. Download and use in slides

### As SVG (for papers)
- Same process, choose SVG for scalability
- Editable in Inkscape/Illustrator

### As Code (for blogs)
- Many platforms (GitHub, GitLab, Notion) render Mermaid natively
- Just paste the code block

---

**Created:** January 2026
**Author:** William J. Storey III
**License:** CC BY 4.0
