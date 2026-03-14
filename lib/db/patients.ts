/**
 * Patient data access layer — delegates to Neo4j graph database.
 *
 * MongoDB/Prisma handles auth (Organization, Medic).
 * Neo4j handles all clinical graph data (patients, decision nodes, edges).
 */
export {
  getAllPatients,
  getPatientById,
  upsertPatient,
  deletePatient,
  countPatients,
} from "@/lib/db/neo4j-patients";
