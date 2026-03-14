/**
 * Neo4j Driver singleton — survives HMR in development.
 *
 * Neo4j Aura uses neo4j+s:// (bolt+routing over TLS) so no custom
 * DNS resolution is needed (unlike the MongoDB Atlas workaround).
 */
import neo4j, { type Driver, type Session, type ManagedTransaction } from "neo4j-driver";

const globalForNeo4j = globalThis as unknown as {
  __neo4jDriver: Driver | undefined;
};

function getDriver(): Driver {
  if (!globalForNeo4j.__neo4jDriver) {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USERNAME;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
      throw new Error(
        "Missing NEO4J_URI, NEO4J_USERNAME, or NEO4J_PASSWORD in environment",
      );
    }

    globalForNeo4j.__neo4jDriver = neo4j.driver(
      uri,
      neo4j.auth.basic(user, password),
      {
        maxConnectionPoolSize: 10,
        connectionAcquisitionTimeout: 30_000,
        disableLosslessIntegers: true,
      },
    );
  }
  return globalForNeo4j.__neo4jDriver;
}

/** Get a session scoped to the configured database. */
export function getSession(): Session {
  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  return getDriver().session({ database });
}

/** Run a single Cypher query (convenience wrapper). */
export async function runQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const session = getSession();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => r.toObject() as T);
  } finally {
    await session.close();
  }
}

/** Execute a write transaction (for CREATE/MERGE/DELETE). */
export async function writeTransaction<T = void>(
  work: (tx: ManagedTransaction) => Promise<T>,
): Promise<T> {
  const session = getSession();
  try {
    return await session.executeWrite(work);
  } finally {
    await session.close();
  }
}

/** Execute a read transaction. */
export async function readTransaction<T = void>(
  work: (tx: ManagedTransaction) => Promise<T>,
): Promise<T> {
  const session = getSession();
  try {
    return await session.executeRead(work);
  } finally {
    await session.close();
  }
}

export { neo4j };
export default getDriver;

