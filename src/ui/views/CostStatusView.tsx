import React from 'react';

interface CostStatusViewProps {
  storageMode: 'local' | 'cloud';
}

export const CostStatusView: React.FC<CostStatusViewProps> = ({ storageMode }) => {
  const freeTierServices = [
    {
      name: 'Amazon Cognito',
      role: 'User Pool Authentication & JWT issuance',
      freeAllowance: '50,000 MAUs forever free',
      usage: '0 MAUs (Local mode active)',
      riskLevel: 'Zero (Well within limits)',
    },
    {
      name: 'Amazon API Gateway',
      role: 'HTTP API (Payloads bypass via S3 presigned URLs)',
      freeAllowance: '1,000,000 calls / month (first 12 mos)',
      usage: '0 calls',
      riskLevel: 'Zero (Lightweight metadata only)',
    },
    {
      name: 'AWS Lambda',
      role: 'Serverless backend (128 MB RAM, 10s timeout)',
      freeAllowance: '1,000,000 requests & 3.2M sec compute / month',
      usage: '0 ms compute',
      riskLevel: 'Zero (No ZIP file processing in Lambda)',
    },
    {
      name: 'Amazon DynamoDB',
      role: 'Single-Table package metadata (PAY_PER_REQUEST)',
      freeAllowance: '25 GB storage & 25 RCU/WCU forever free',
      usage: '0 items',
      riskLevel: 'Zero (On-demand billing = $0 at idle)',
    },
    {
      name: 'Amazon S3',
      role: 'Private storage bucket for SimXPack ZIP archives',
      freeAllowance: '5 GB standard storage & 20,000 GETs (12 mos)',
      usage: '0 bytes',
      riskLevel: 'Low (Lifecycle rule auto-deletes test files)',
    },
    {
      name: 'Amazon CloudWatch',
      role: 'Lambda execution logs with 7-day retention',
      freeAllowance: '5 GB ingestion & 5 GB archive forever free',
      usage: '0 logs',
      riskLevel: 'Zero (Strict 7-day retention rule)',
    },
  ];

  const prohibitedServices = [
    'Amazon EC2 Instances (No virtual servers)',
    'Amazon RDS Databases (No relational DB instances)',
    'AWS NAT Gateways (Heavy hourly charge)',
    'Amazon CloudFront (Extra egress / distribution costs)',
    'AWS WAF (Web Application Firewall hourly fees)',
    'Amazon Route 53 (Hosted zone fees)',
    'DynamoDB Point-In-Time Backups (Additional storage costs)',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: 24, borderLeft: '4px solid #10b981' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="badge badge-emerald">Active Mode: {storageMode.toUpperCase()}</span>
              <span className="badge badge-indigo">Cost Gate Status: SAFE</span>
            </div>
            <h2 style={{ fontSize: 24, marginBottom: 6 }}>AWS Architecture & Zero-Cost Telemetry</h2>
            <p style={{ maxWidth: 720 }}>
              SimXSphere is engineered with an <strong>offline-first local core</strong>. In Local Mode, all data is stored exclusively in your browser session with absolute zero AWS bill. In Cloud Mode, serverless services stay strictly within AWS Free Tier quotas.
            </p>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px 20px', borderRadius: 12, textAlign: 'right', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <div style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>ESTIMATED MONTHLY COST</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>$0.00</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Free-Tier Compliance 100%</div>
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, marginBottom: 16 }}>Authorized AWS Serverless Services</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 16px' }}>Service</th>
                <th style={{ padding: '12px 16px' }}>Role in SimXSphere</th>
                <th style={{ padding: '12px 16px' }}>Free Tier Allowance</th>
                <th style={{ padding: '12px 16px' }}>Current State</th>
                <th style={{ padding: '12px 16px' }}>Cost Risk</th>
              </tr>
            </thead>
            <tbody>
              {freeTierServices.map((svc) => (
                <tr key={svc.name} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-main)' }}>{svc.name}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{svc.role}</td>
                  <td style={{ padding: '14px 16px', color: '#a5b4fc', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{svc.freeAllowance}</td>
                  <td style={{ padding: '14px 16px', color: '#34d399', fontFamily: 'var(--font-mono)' }}>{svc.usage}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className="badge badge-emerald" style={{ fontSize: 10 }}>{svc.riskLevel}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Excluded Services & Safeguards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <div className="glass-panel" style={{ padding: 24, borderTop: '3px solid #f43f5e' }}>
          <h3 style={{ fontSize: 16, marginBottom: 12, color: '#fda4af' }}>Strictly Excluded AWS Services</h3>
          <p style={{ fontSize: 13, marginBottom: 14 }}>
            The following services are intentionally omitted from our CloudFormation / SAM template to prevent unexpected billing traps:
          </p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {prohibitedServices.map((item) => (
              <li key={item} style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#f43f5e', fontWeight: 'bold' }}>✕</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-panel" style={{ padding: 24, borderTop: '3px solid #6366f1' }}>
          <h3 style={{ fontSize: 16, marginBottom: 12, color: '#a5b4fc' }}>Presigned S3 Direct Upload Flow</h3>
          <p style={{ fontSize: 13, marginBottom: 14 }}>
            Large SimXPack binary archives bypass API Gateway and Lambda completely:
          </p>
          <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: 14, borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-mono)', lineHeight: 1.8, color: '#94a3b8' }}>
            <div>1. Browser → POST /packages (Lambda allocates metadata)</div>
            <div>2. Lambda generates S3 presigned POST (5 min expiry, &le;5 MB)</div>
            <div>3. Browser uploads ZIP directly to private S3 bucket</div>
            <div>4. Zero bandwidth fees through Lambda compute</div>
          </div>
        </div>
      </div>
    </div>
  );
};
