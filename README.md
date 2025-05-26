# ZK-Relief: A Privacy-Preserving Mental Health Support Platform

![image](https://github.com/user-attachments/assets/6f0ac9c2-21ec-47ff-976f-60bf305025d1)


## Executive Summary

**ZK-Relief** is a decentralized, privacy-centric mental health support platform built on the SUI blockchain. It leverages **zkLogin** for anonymous user authentication and **Elliptic Curve Verifiable Random Function (ECVRF)** for verifiable, unbiased assignment of crisis reports to counselors. This architecture ensures confidentiality, fairness, and verifiability, addressing critical barriers in mental health support systems.

## Problem Statement

### Global Mental Health Crisis

* **Prevalence**: Approximately 1 in 8 individuals worldwide live with a mental health disorder. ([mentalhealth.inc][1])

* **Economic Impact**: Mental health conditions cost the global economy an estimated **\$1 trillion annually** in lost productivity. ([Electro IQ][2])

* **Treatment Gap**: In low- and middle-income countries, up to **90%** of people with mental health disorders receive no treatment. ([Public Health Concern Nepal - PHC- Nepal][3])

### Barriers to Seeking Help

* **Stigma**: Over **60%** of individuals with mental health conditions do not seek help due to stigma and discrimination. ([mentalhealth.inc][1])

* **Privacy Concerns**: Fear of exposure deters many from accessing mental health services, especially in conservative societies.

* **Resource Constraints**: Limited availability of mental health professionals and infrastructure exacerbates the accessibility issue.

## Solution Overview

ZK-Relief addresses these challenges through:

* **Anonymous Authentication**: Utilizing zkLogin, users can authenticate without revealing their identity, preserving privacy.

* **Fair Assignment**: Employing ECVRF ensures that crisis reports are assigned to counselors in a verifiable and unbiased manner.

* **Immutable Records**: All interactions are recorded on the SUI blockchain, ensuring transparency and tamper-proof audit trails.

## Technical Architecture

<img width="1396" alt="image" src="https://github.com/user-attachments/assets/34f2b602-9044-4218-803d-8fc8f6f6513f" />


### Core Components

* **zkLogin**: Enables users to prove their identity without disclosing personal information, ensuring anonymity.

* **ECVRF**: Generates verifiable random outputs used to assign crisis reports to counselors, ensuring fairness.

* **SUI Smart Contracts**: Manage user registrations, crisis reports, counselor assignments, and remedy suggestions.

### Data Structures

* **CrisisReport**: Contains the report ID, content, and timestamp.

* **Patient**: Stores patient information, including address, name, optional photo, and suggested remedies.

* **Counselor**: Holds counselor details and a map of pending crisis reports.

* **Handlers**: Manage collections of patients and counselors.([Public Health Concern Nepal - PHC- Nepal][3])

### Workflow

<img width="563" alt="image" src="https://github.com/user-attachments/assets/84797fb9-d0a8-4bd2-a8d7-ae3944ca7bab" />
<img width="591" alt="image" src="https://github.com/user-attachments/assets/25ae24de-931e-4062-bf10-3ef4cdbb2ec3" />

1. **Initialization**: Deploy the smart contract, creating admin capabilities and shared handlers for patients and counselors.

2. **Counselor Registration**: Admins add counselors by providing their address, name, and optional photo.

3. **Crisis Report Submission**:

   * A patient submits a crisis report along with ECVRF output and proof.
   * The system verifies the proof and assigns the report to a counselor based on the generated randomness.

4. **Remedy Suggestion**: Assigned counselors can suggest remedies, which are recorded in the patient's profile.

5. **Event Emission**: All significant actions emit events for transparency and auditing.
 <img width="941" alt="image" src="https://github.com/user-attachments/assets/beae421e-bbfd-47d9-8151-bb4fb090e56d" />

## Real-World Impact

### Enhancing Access to Mental Health Support

* **Anonymity**: Encourages individuals, especially in stigmatized environments, to seek help without fear of exposure.

* **Equitable Resource Allocation**: Ensures fair distribution of cases among counselors, preventing overload and burnout.

* **Transparency**: Immutable records foster trust among users and stakeholders.

### Scalability and Adaptability

* **Modular Design**: The system can be extended to include features like automated triage, multilingual support, and integration with existing healthcare systems.

* **Global Applicability**: While initially targeting regions with high stigma, the platform's design allows for adaptation to various cultural and legal contexts.

## Conclusion

ZK-Relief presents a robust, privacy-preserving solution to the global mental health crisis. By leveraging cutting-edge cryptographic techniques and decentralized infrastructure, it addresses critical barriers to mental health support, offering a scalable and transparent platform adaptable to diverse real-world scenarios.

---
Resources: 
[1]: https://mentalhealth.inc/Mental-health-data?utm_source=chatgpt.com "MHI - Mental Health Incorporation"
[2]: https://electroiq.com/stats/mental-health-statistics/?utm_source=chatgpt.com "Mental Health Statistics By Countries, Age and Facts [2024*]"
[3]: https://phcnepal.com/global-mental-health-trends-stat-challenges-success-stories-and-policy-impacts/?utm_source=chatgpt.com "Global Mental Health Trends: Stat, Challenges, Success Stories, and Policy Impacts - Public Health Concern Nepal"

