import { PrismaClient } from '@prisma/client'
import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2/promise'

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
  schemaInitPromise?: Promise<void>
}

const SCHEMA_INIT_LOCK_NAME = 'picinterpreter_schema_init'

const CREATE_SCHEMA_STATEMENTS = [
  `CREATE TABLE \`User\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`isAnonymous\` BOOLEAN NOT NULL DEFAULT true,
    \`status\` ENUM('ACTIVE', 'MERGED', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    \`mergedIntoUserId\` VARCHAR(191) NULL,
    \`lastLoginAt\` DATETIME(3) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`User_mergedIntoUserId_idx\` (\`mergedIntoUserId\`),
    CONSTRAINT \`User_mergedIntoUserId_fkey\`
      FOREIGN KEY (\`mergedIntoUserId\`) REFERENCES \`User\`(\`id\`)
      ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE \`Device\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`installIdHash\` VARCHAR(191) NOT NULL,
    \`platform\` VARCHAR(191) NULL,
    \`appVersion\` VARCHAR(191) NULL,
    \`lastSeenAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`Device_installIdHash_key\` (\`installIdHash\`),
    INDEX \`Device_userId_idx\` (\`userId\`),
    CONSTRAINT \`Device_userId_fkey\`
      FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`)
      ON DELETE RESTRICT ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE \`AuthAccount\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`provider\` VARCHAR(191) NOT NULL,
    \`providerAccountId\` VARCHAR(191) NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`AuthAccount_provider_providerAccountId_key\` (\`provider\`, \`providerAccountId\`),
    INDEX \`AuthAccount_userId_idx\` (\`userId\`),
    CONSTRAINT \`AuthAccount_userId_fkey\`
      FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE \`PasswordCredential\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`username\` VARCHAR(191) NOT NULL,
    \`normalizedUsername\` VARCHAR(191) NOT NULL,
    \`phone\` VARCHAR(191) NOT NULL,
    \`normalizedPhone\` VARCHAR(191) NOT NULL,
    \`passwordHash\` VARCHAR(191) NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`PasswordCredential_userId_key\` (\`userId\`),
    UNIQUE INDEX \`PasswordCredential_normalizedUsername_key\` (\`normalizedUsername\`),
    UNIQUE INDEX \`PasswordCredential_normalizedPhone_key\` (\`normalizedPhone\`),
    CONSTRAINT \`PasswordCredential_userId_fkey\`
      FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE \`UserSession\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`deviceId\` VARCHAR(191) NULL,
    \`tokenHash\` VARCHAR(191) NOT NULL,
    \`expiresAt\` DATETIME(3) NOT NULL,
    \`lastSeenAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`revokedAt\` DATETIME(3) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`UserSession_tokenHash_key\` (\`tokenHash\`),
    INDEX \`UserSession_userId_expiresAt_idx\` (\`userId\`, \`expiresAt\`),
    INDEX \`UserSession_deviceId_idx\` (\`deviceId\`),
    CONSTRAINT \`UserSession_userId_fkey\`
      FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`UserSession_deviceId_fkey\`
      FOREIGN KEY (\`deviceId\`) REFERENCES \`Device\`(\`id\`)
      ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE \`ExpressionRecord\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`sessionId\` VARCHAR(191) NOT NULL,
    \`direction\` VARCHAR(191) NOT NULL,
    \`pictogramIds\` JSON NOT NULL,
    \`pictogramLabels\` JSON NOT NULL,
    \`candidateSentences\` JSON NOT NULL,
    \`selectedSentence\` VARCHAR(191) NULL,
    \`inputText\` VARCHAR(191) NULL,
    \`isFavorite\` BOOLEAN NOT NULL DEFAULT false,
    \`createdAt\` DATETIME(3) NOT NULL,
    \`updatedAt\` DATETIME(3) NOT NULL,
    \`deletedAt\` DATETIME(3) NULL,
    \`version\` INT NOT NULL DEFAULT 1,
    \`lastModifiedByDeviceId\` VARCHAR(191) NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`ExpressionRecord_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
    INDEX \`ExpressionRecord_userId_sessionId_createdAt_idx\` (\`userId\`, \`sessionId\`, \`createdAt\`),
    INDEX \`ExpressionRecord_lastModifiedByDeviceId_idx\` (\`lastModifiedByDeviceId\`),
    CONSTRAINT \`ExpressionRecord_userId_fkey\`
      FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`ExpressionRecord_lastModifiedByDeviceId_fkey\`
      FOREIGN KEY (\`lastModifiedByDeviceId\`) REFERENCES \`Device\`(\`id\`)
      ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE \`SavedPhraseRecord\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`sentence\` VARCHAR(191) NOT NULL,
    \`pictogramIds\` JSON NOT NULL,
    \`usageCount\` INT NOT NULL DEFAULT 0,
    \`lastUsedAt\` DATETIME(3) NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL,
    \`updatedAt\` DATETIME(3) NOT NULL,
    \`deletedAt\` DATETIME(3) NULL,
    \`version\` INT NOT NULL DEFAULT 1,
    \`lastModifiedByDeviceId\` VARCHAR(191) NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`SavedPhraseRecord_userId_lastUsedAt_idx\` (\`userId\`, \`lastUsedAt\`),
    INDEX \`SavedPhraseRecord_userId_updatedAt_idx\` (\`userId\`, \`updatedAt\`),
    INDEX \`SavedPhraseRecord_lastModifiedByDeviceId_idx\` (\`lastModifiedByDeviceId\`),
    CONSTRAINT \`SavedPhraseRecord_userId_fkey\`
      FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`SavedPhraseRecord_lastModifiedByDeviceId_fkey\`
      FOREIGN KEY (\`lastModifiedByDeviceId\`) REFERENCES \`Device\`(\`id\`)
      ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE \`SyncChange\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`userId\` VARCHAR(191) NOT NULL,
    \`entityType\` ENUM('EXPRESSION', 'SAVED_PHRASE') NOT NULL,
    \`recordId\` VARCHAR(191) NOT NULL,
    \`operation\` ENUM('UPSERT', 'DELETE') NOT NULL,
    \`recordVersion\` INT NOT NULL,
    \`changedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`deviceId\` VARCHAR(191) NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`SyncChange_userId_id_idx\` (\`userId\`, \`id\`),
    INDEX \`SyncChange_userId_entityType_recordId_id_idx\` (\`userId\`, \`entityType\`, \`recordId\`, \`id\`),
    INDEX \`SyncChange_deviceId_idx\` (\`deviceId\`),
    CONSTRAINT \`SyncChange_deviceId_fkey\`
      FOREIGN KEY (\`deviceId\`) REFERENCES \`Device\`(\`id\`)
      ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
]

export function isDatabaseConfigured(): boolean {
  return typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim().length > 0
}

export function getPrismaClient(): PrismaClient {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not configured')
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient()
  }

  return globalForPrisma.prisma
}

export async function ensureDatabaseSchema(): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not configured')
  }

  if (!globalForPrisma.schemaInitPromise) {
    globalForPrisma.schemaInitPromise = initializeSchemaIfDatabaseIsEmpty().catch((error) => {
      globalForPrisma.schemaInitPromise = undefined
      throw error
    })
  }

  return globalForPrisma.schemaInitPromise
}

async function initializeSchemaIfDatabaseIsEmpty(): Promise<void> {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!)

  try {
    const [lockRows] = await connection.query<RowDataPacket[]>(
      'SELECT GET_LOCK(?, 10) AS acquired',
      [SCHEMA_INIT_LOCK_NAME],
    )
    if (Number(lockRows[0]?.acquired ?? 0) !== 1) {
      throw new Error('Timed out waiting for database schema initialization lock')
    }

    try {
      if (!(await isCurrentDatabaseEmpty(connection))) return

      for (const statement of CREATE_SCHEMA_STATEMENTS) {
        await connection.query(statement)
      }
    } finally {
      await connection.query('SELECT RELEASE_LOCK(?)', [SCHEMA_INIT_LOCK_NAME])
    }
  } finally {
    await connection.end()
  }
}

async function isCurrentDatabaseEmpty(connection: mysql.Connection): Promise<boolean> {
  const [rows] = await connection.query<RowDataPacket[]>(`
    SELECT COUNT(*) AS tableCount
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_type = 'BASE TABLE'
  `)

  return Number(rows[0]?.tableCount ?? 0) === 0
}
