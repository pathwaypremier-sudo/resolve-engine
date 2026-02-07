import { pool } from './pool.server';
import { randomUUID } from 'node:crypto';

// Types (mirroring schema for now)
export type User = {
    id: string;
    email: string;
    createdAt: Date;
};

export type Case = {
    id: string;
    userId: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
};

export type CaseFact = {
    id: string;
    caseId: string;
    key: string;
    value: string;
    source: string | null;
    confidence: number | null;
    updatedAt: Date;
};

export type EvidenceDoc = {
    id: string;
    caseId: string;
    filename: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: Date;
};

export type AssessmentResult = {
    id: string;
    caseId: string;
    verdict: string;
    checks: any;
    reasons: any;
    missingInfo: any;
    generatedAt: Date;
};

// --- User ---

function mapUser(row: any): User {
    return {
        id: row.id,
        email: row.email,
        createdAt: row.created_at
    };
}

export async function createUserIfMissing(email: string): Promise<User> {
    const result = await pool.query(
        `INSERT INTO users (id, email, created_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING *`,
        [randomUUID(), email]
    );
    return mapUser(result.rows[0]);
}

// --- Case ---

function mapCase(row: any): Case {
    return {
        id: row.id,
        userId: row.user_id,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export async function ensureCase(caseId: string, userId: string): Promise<Case> {
    const result = await pool.query(
        `INSERT INTO cases (id, user_id, status, created_at, updated_at)
     VALUES ($1, $2, 'active', NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
        [caseId, userId]
    );
    return mapCase(result.rows[0]);
}

export async function loadCaseById(caseId: string): Promise<Case | null> {
    const result = await pool.query(`SELECT * FROM cases WHERE id = $1`, [caseId]);
    return result.rows[0] ? mapCase(result.rows[0]) : null;
}


// --- Case Facts ---

function mapCaseFact(row: any): CaseFact {
    return {
        id: row.id,
        caseId: row.case_id,
        key: row.key,
        value: row.value,
        source: row.source,
        confidence: row.confidence,
        updatedAt: row.updated_at
    };
}

export async function upsertCaseFact(
    caseId: string,
    key: string,
    value: string,
    source?: string | null,
    confidence: number = 1.0
): Promise<CaseFact> {
    const result = await pool.query(
        `INSERT INTO case_facts (id, case_id, key, value, source, confidence, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (case_id, key) 
     DO UPDATE SET 
       value = EXCLUDED.value,
       source = EXCLUDED.source,
       confidence = EXCLUDED.confidence,
       updated_at = NOW()
     RETURNING *`,
        [randomUUID(), caseId, key, value, source || null, confidence]
    );
    return mapCaseFact(result.rows[0]);
}

export async function loadCaseFacts(caseId: string): Promise<CaseFact[]> {
    const result = await pool.query(`SELECT * FROM case_facts WHERE case_id = $1`, [caseId]);
    return result.rows.map(mapCaseFact);
}

// --- Evidence ---

function mapEvidenceDoc(row: any): EvidenceDoc {
    return {
        id: row.id,
        caseId: row.case_id,
        filename: row.filename,
        storagePath: row.storage_path,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        uploadedAt: row.uploaded_at
    };
}

export async function addEvidenceDoc(
    caseId: string,
    metadata: {
        filename: string;
        storagePath: string;
        mimeType: string;
        sizeBytes: number;
    }
): Promise<EvidenceDoc> {
    const result = await pool.query(
        `INSERT INTO evidence_docs (id, case_id, filename, storage_path, mime_type, size_bytes, uploaded_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
        [randomUUID(), caseId, metadata.filename, metadata.storagePath, metadata.mimeType, metadata.sizeBytes]
    );
    return mapEvidenceDoc(result.rows[0]);
}

export async function loadEvidenceDocs(caseId: string): Promise<EvidenceDoc[]> {
    const result = await pool.query(`SELECT * FROM evidence_docs WHERE case_id = $1 ORDER BY uploaded_at DESC`, [caseId]);
    return result.rows.map(mapEvidenceDoc);
}

// --- Assessment ---

function mapAssessmentResult(row: any): AssessmentResult {
    return {
        id: row.id,
        caseId: row.case_id,
        verdict: row.verdict,
        checks: row.checks,
        reasons: row.reasons,
        missingInfo: row.missing_info,
        generatedAt: row.generated_at
    };
}

export async function saveAssessmentResult(
    caseId: string,
    result: {
        verdict: string;
        checks: any;
        reasons: any;
        missingInfo: any;
    }
): Promise<AssessmentResult> {
    const dbResult = await pool.query(
        `INSERT INTO assessment_results (id, case_id, verdict, checks, reasons, missing_info, generated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
        [randomUUID(), caseId, result.verdict, JSON.stringify(result.checks), JSON.stringify(result.reasons), JSON.stringify(result.missingInfo)]
    );
    return mapAssessmentResult(dbResult.rows[0]);
}

export async function loadAssessmentResults(caseId: string): Promise<AssessmentResult[]> {
    const result = await pool.query(`SELECT * FROM assessment_results WHERE case_id = $1 ORDER BY generated_at DESC`, [caseId]);
    return result.rows.map(mapAssessmentResult);
}

export async function loadLatestAssessmentResult(caseId: string): Promise<AssessmentResult | null> {
    const result = await pool.query(`SELECT * FROM assessment_results WHERE case_id = $1 ORDER BY generated_at DESC LIMIT 1`, [caseId]);
    return result.rows[0] ? mapAssessmentResult(result.rows[0]) : null;
}

// --- Admin / Settings ---

export type UserWithAdmin = User & { isAdmin: boolean };

function mapUserWithAdmin(row: any): UserWithAdmin {
    return {
        id: row.id,
        email: row.email,
        createdAt: row.created_at,
        isAdmin: row.is_admin === true
    };
}

export async function getUserById(userId: string): Promise<UserWithAdmin | null> {
    const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [userId]);
    return result.rows[0] ? mapUserWithAdmin(result.rows[0]) : null;
}

export async function getUserByEmail(email: string): Promise<UserWithAdmin | null> {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    return result.rows[0] ? mapUserWithAdmin(result.rows[0]) : null;
}

export async function setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
    await pool.query(`UPDATE users SET is_admin = $2 WHERE id = $1`, [userId, isAdmin]);
}

export async function countAdmins(): Promise<number> {
    const result = await pool.query(`SELECT COUNT(*) as count FROM users WHERE is_admin = true`);
    return parseInt(result.rows[0].count, 10);
}

export async function createUserWithAdmin(email: string, isAdmin: boolean): Promise<UserWithAdmin> {
    const result = await pool.query(
        `INSERT INTO users (id, email, is_admin, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (email) DO UPDATE SET is_admin = EXCLUDED.is_admin
         RETURNING *`,
        [randomUUID(), email, isAdmin]
    );
    return mapUserWithAdmin(result.rows[0]);
}

// --- App Settings ---

export type AppSetting = {
    key: string;
    value: any;
    updatedAt: Date;
    updatedBy: string | null;
};

function mapAppSetting(row: any): AppSetting {
    return {
        key: row.key,
        value: row.value,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by
    };
}

export async function getAppSetting(key: string): Promise<AppSetting | null> {
    const result = await pool.query(`SELECT * FROM app_settings WHERE key = $1`, [key]);
    return result.rows[0] ? mapAppSetting(result.rows[0]) : null;
}

export async function setAppSetting(key: string, value: any, updatedBy: string): Promise<AppSetting> {
    const result = await pool.query(
        `INSERT INTO app_settings (key, value, updated_at, updated_by)
         VALUES ($1, $2, NOW(), $3)
         ON CONFLICT (key) DO UPDATE SET 
           value = EXCLUDED.value,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by
         RETURNING *`,
        [key, JSON.stringify(value), updatedBy]
    );
    return mapAppSetting(result.rows[0]);
}

// --- Admin Audit Logs ---

export type AdminAuditLog = {
    id: string;
    actorUserId: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    metadata: any;
    ip: string | null;
    userAgent: string | null;
    createdAt: Date;
};

function mapAdminAuditLog(row: any): AdminAuditLog {
    return {
        id: row.id,
        actorUserId: row.actor_user_id,
        action: row.action,
        targetType: row.target_type,
        targetId: row.target_id,
        metadata: row.metadata,
        ip: row.ip,
        userAgent: row.user_agent,
        createdAt: row.created_at
    };
}

export async function insertAdminAuditLog(entry: {
    actorUserId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: any;
    ip?: string;
    userAgent?: string;
}): Promise<AdminAuditLog> {
    const result = await pool.query(
        `INSERT INTO admin_audit_logs (id, actor_user_id, action, target_type, target_id, metadata, ip, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING *`,
        [
            randomUUID(),
            entry.actorUserId,
            entry.action,
            entry.targetType || null,
            entry.targetId || null,
            entry.metadata ? JSON.stringify(entry.metadata) : null,
            entry.ip || null,
            entry.userAgent || null
        ]
    );
    return mapAdminAuditLog(result.rows[0]);
}

export async function loadAdminAuditLogs(limit: number = 100, offset: number = 0): Promise<AdminAuditLog[]> {
    const result = await pool.query(
        `SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
    );
    return result.rows.map(mapAdminAuditLog);
}

export async function loadAdminAuditLogsWithActor(limit: number = 100, offset: number = 0): Promise<(AdminAuditLog & { actorEmail?: string })[]> {
    const result = await pool.query(
        `SELECT a.*, u.email as actor_email 
         FROM admin_audit_logs a 
         LEFT JOIN users u ON a.actor_user_id = u.id 
         ORDER BY a.created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
    );
    return result.rows.map(row => ({
        ...mapAdminAuditLog(row),
        actorEmail: row.actor_email
    }));
}
