

# ZK-Relief: A Privacy-Preserving Mental Health Support Platform

![ZK-Relief Banner](https://github.com/user-attachments/assets/6f0ac9c2-21ec-47ff-976f-60bf305025d1)


## Live Testnet Deployment

ZK-Relief is deployed on the **SUI Testnet**, providing a fully functional demonstration of our decentralized mental health support ecosystem. The following deployment identifiers represent the on-chain components:

* **packageId**: `0xde84df2a5144b03217aaec1269b9baa3abfeb1d901444a6885b91483ee108ff7`
* **counsellorHandlerId**: `0x8ca12a3f40e6b6a2ac6ca70c4244e0163d71bf1ccbba6bcd3a33c8ff9cdd1a3a`
* **patientHandlerId**: `0xb6822983b28d472f850b8a216c9fb45b12f17af9143b09243e4d9700180ba98e`
* **clockId**: `0x0000000000000000000000000000000000000000000000000000000000000006`

---

## Executive Summary

**ZK-Relief** is a decentralized, privacy-focused mental health support platform built on the SUI blockchain. It uses **zkLogin** for anonymous user authentication and **Elliptic Curve Verifiable Random Function (ECVRF)** for unbiased, verifiable assignment of crisis reports to counselors. This approach ensures confidentiality, fairness, and verifiability—key concerns in mental health support systems globally.

---

## Problem Statement

### Global Mental Health Crisis

* **Prevalence**: One in eight individuals worldwide live with a mental health disorder.
* **Economic Burden**: Mental health issues cost the global economy an estimated **\$1 trillion annually** in lost productivity.
* **Access Gap**: Up to **90%** of people in low- and middle-income countries with mental health disorders receive no treatment.
  \[Source: Public Health Concern Nepal]

### Barriers to Seeking Help

* **Stigma**: More than **60%** of those affected do not seek help due to societal stigma and discrimination.
* **Privacy Concerns**: Fear of being exposed or identified deters many individuals from accessing support.
* **Resource Limitations**: A global shortage of mental health professionals restricts access to timely care.

---

## Solution Overview

ZK-Relief addresses these challenges by combining privacy-preserving cryptographic primitives with a decentralized infrastructure.

* **Anonymous Authentication**: Uses zkLogin to enable identity-proofing without revealing personal information.
* **Fair Assignment**: Implements ECVRF to assign crisis reports to counselors in a verifiably random and unbiased way.
* **Immutable Audit Trail**: All actions are recorded on-chain, ensuring transparency and tamper-proof traceability.

---

## Technical Architecture

![Architecture Diagram](https://github.com/user-attachments/assets/34f2b602-9044-4218-803d-8fc8f6f6513f)

### Core Components

* **zkLogin**: Ensures anonymous access for patients while verifying credentials.
* **ECVRF**: Provides cryptographically verifiable randomness for unbiased report distribution.
* **SUI Smart Contracts**: Handle user registration, crisis report creation, counselor assignment, and remedy tracking.

### Data Structures

* **CrisisReport**: Contains report ID, content, and timestamp.
* **Patient**: Stores address, name, optional photo, and a list of suggested remedies.
* **Counselor**: Contains counselor details and a mapping of assigned crisis reports.
* **Handlers**: Shared objects that manage the collection of patients and counselors.

---

## Workflow

![Workflow Part 1](https://github.com/user-attachments/assets/84797fb9-d0a8-4bd2-a8d7-ae3944ca7bab)
![Workflow Part 2](https://github.com/user-attachments/assets/25ae24de-931e-4062-bf10-3ef4cdbb2ec3)

1. **Initialization**: The administrator deploys the contracts and initializes shared handler objects for patients and counselors.
2. **Counselor Registration**: Admins add counselors with address, name, and optional metadata.
3. **Crisis Report Submission**: Patients submit a report along with ECVRF output and proof. The contract verifies the proof and assigns the report based on randomness.
4. **Remedy Suggestion**: Counselors review assigned reports and suggest remedies, which are added to the patient's record.
5. **Event Logging**: Every major transaction emits an event to support auditability and transparency.

![Event Emission Diagram](https://github.com/user-attachments/assets/beae421e-bbfd-47d9-8151-bb4fb090e56d)

---

## Real-World Impact

### Improving Mental Health Support

* **Anonymity**: Encourages individuals to seek help in privacy-sensitive or conservative environments.
* **Fair Workload Distribution**: Prevents counselor burnout by distributing cases evenly and randomly.
* **Transparent Operations**: Blockchain ensures all data is immutable and auditable by relevant stakeholders.

### Scalability and Extensibility

* **Modular System Design**: Easy to add features such as triage automation, natural language interfaces, and multilingual support.
* **Global Deployment Readiness**: Applicable in diverse legal, cultural, and infrastructural settings.

---

## Conclusion

ZK-Relief combines cryptographic integrity, privacy, and decentralization to create a robust platform for mental health support. By solving core challenges like stigma, unfair access, and lack of privacy, it opens the door to scalable, transparent, and trustworthy mental health services—especially for underserved populations.

---

## References

* [Mental Health Incorporation - MHI](https://mentalhealth.inc/Mental-health-data?utm_source=chatgpt.com)
* [ElectroIQ: Mental Health Statistics 2024](https://electroiq.com/stats/mental-health-statistics/?utm_source=chatgpt.com)
* [Public Health Concern Nepal (PHC-Nepal)](https://phcnepal.com/global-mental-health-trends-stat-challenges-success-stories-and-policy-impacts/?utm_source=chatgpt.com)

---

