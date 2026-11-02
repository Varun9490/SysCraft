/**
 * IaC linting (Checkov-style) for SysCraft exports.
 *
 * Runs lightweight regex rules over generated Terraform / Kubernetes /
 * Docker Compose text and returns findings. Pure, runs in browser.
 */

export type LintSeverity = "error" | "warning" | "info";

export interface LintFinding {
  rule: string;
  severity: LintSeverity;
  title: string;
  detail: string;
  line?: number;
}

export interface LintReport {
  findings: LintFinding[];
  passed: boolean;
}

interface Rule {
  id: string;
  severity: LintSeverity;
  title: string;
  detail: string;
  test: (text: string) => boolean; // returns true when VIOLATION present
}

const TERRAFORM_RULES: Rule[] = [
  {
    id: "CKV_AWS_18",
    severity: "error",
    title: "S3 bucket without access logging",
    detail: "Enable access logging on every S3 bucket.",
    test: (t) => /resource\s+"aws_s3_bucket"/.test(t) && !/logging\s*\{/.test(t),
  },
  {
    id: "CKV_AWS_19",
    severity: "error",
    title: "S3 bucket without server-side encryption",
    detail: "Enable SSE (aws:kms or AES256) on every bucket.",
    test: (t) => /resource\s+"aws_s3_bucket"/.test(t) && !/server_side_encryption_configuration/.test(t),
  },
  {
    id: "CKV_AWS_20",
    severity: "error",
    title: "S3 bucket allows public ACL",
    detail: "Block public access on every bucket.",
    test: (t) => /acl\s*=\s*"public/.test(t),
  },
  {
    id: "CKV_AWS_57",
    severity: "warning",
    title: "Security group allows 0.0.0.0/0 ingress",
    detail: "Restrict ingress to known CIDRs.",
    test: (t) => /0\.0\.0\.0\/0/.test(t),
  },
  {
    id: "CKV_AWS_23",
    severity: "warning",
    title: "Security group allows SSH from anywhere",
    detail: "Restrict port 22 to a bastion CIDR.",
    test: (t) => /from_port\s*=\s*22/.test(t) && /0\.0\.0\.0\/0/.test(t),
  },
  {
    id: "CKV_AWS_145",
    severity: "info",
    title: "RDS instance without deletion protection",
    detail: "Enable deletion_protection on production databases.",
    test: (t) => /resource\s+"aws_db_instance"/.test(t) && !/deletion_protection\s*=\s*true/.test(t),
  },
];

const K8S_RULES: Rule[] = [
  {
    id: "CKV_K8S_1",
    severity: "error",
    title: "Container running as privileged",
    detail: "Set privileged: false.",
    test: (t) => /privileged:\s*true/.test(t),
  },
  {
    id: "CKV_K8S_12",
    severity: "error",
    title: "Container uses :latest tag",
    detail: "Pin image tags to a digest or version.",
    test: (t) => /image:.*:latest/.test(t),
  },
  {
    id: "CKV_K8S_20",
    severity: "warning",
    title: "Missing resource limits",
    detail: "Define resources.limits for cpu and memory.",
    test: (t) => /containers:/.test(t) && !/limits:/.test(t),
  },
  {
    id: "CKV_K8S_21",
    severity: "warning",
    title: "Missing network policy",
    detail: "Add a NetworkPolicy restricting pod traffic.",
    test: (t) => /kind:\s*Deployment/.test(t) && !/kind:\s*NetworkPolicy/.test(t),
  },
  {
    id: "CKV_K8S_14",
    severity: "error",
    title: "Root filesystem writable",
    detail: "Set readOnlyRootFilesystem: true.",
    test: (t) => /readOnlyRootFilesystem:\s*false/.test(t),
  },
];

const DOCKER_RULES: Rule[] = [
  {
    id: "CKV_DOCKER_2",
    severity: "warning",
    title: "Container running as root",
    detail: "Add a USER directive in the Dockerfile.",
    test: (t) => !/USER\s+\w/.test(t) && /FROM\s/.test(t),
  },
  {
    id: "CKV_DOCKER_7",
    severity: "info",
    title: "Using latest base image",
    detail: "Pin the base image tag.",
    test: (t) => /FROM\s+\S+:latest/.test(t),
  },
];

function rulesFor(format: string): Rule[] {
  const f = format.toLowerCase();
  if (f.includes("terraform") || f === "tf") return TERRAFORM_RULES;
  if (f.includes("kubernetes") || f.includes("k8s") || f === "yaml") return K8S_RULES;
  if (f.includes("docker")) return DOCKER_RULES;
  return [];
}

export function lintIac(format: string, text: string): LintReport {
  const rules = rulesFor(format);
  const findings: LintFinding[] = [];
  for (const r of rules) {
    if (r.test(text)) {
      findings.push({
        rule: r.id,
        severity: r.severity,
        title: r.title,
        detail: r.detail,
      });
    }
  }
  const passed = !findings.some((f) => f.severity === "error");
  return { findings, passed };
}

export function lintAll(exports: Record<string, string>): Record<string, LintReport> {
  const out: Record<string, LintReport> = {};
  for (const [fmt, text] of Object.entries(exports)) {
    out[fmt] = lintIac(fmt, text);
  }
  return out;
}
