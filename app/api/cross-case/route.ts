import { NextRequest, NextResponse } from "next/server";
import { getCurrentMedic } from "@/lib/auth/get-current-medic";
import {
  findSimilarPatients,
  alignDecisionGraphs,
  findDivergencePoints,
  computeOutcomeCorrelations,
} from "@/lib/db/neo4j-cross-case";

/**
 * POST /api/cross-case — Server-side cross-case analysis via Neo4j.
 *
 * Body: { referencePatientId: string, topK?: number }
 * Returns: { matches, alignedPairs, divergences, correlations }
 */
export async function POST(req: NextRequest) {
  try {
    const medic = await getCurrentMedic();
    const { referencePatientId, topK = 10 } = await req.json();

    if (!referencePatientId) {
      return NextResponse.json(
        { error: "Missing referencePatientId" },
        { status: 400 },
      );
    }

    // 1. Find similar patients
    const matches = await findSimilarPatients(
      medic._id,
      referencePatientId,
      topK,
    );

    const selectedIds = matches
      .filter((m) => m.selected !== false)
      .map((m) => m.patientId);

    if (selectedIds.length === 0) {
      return NextResponse.json({
        matches,
        alignedPairs: [],
        divergences: [],
        correlations: [],
      });
    }

    // 2. Align decision graphs
    const alignedPairs = await alignDecisionGraphs(
      medic._id,
      referencePatientId,
      selectedIds,
    );

    // 3. Find divergence points (thin JS on top of aligned data)
    const divergences = findDivergencePoints(alignedPairs);

    // 4. Compute outcome correlations
    const allIds = [referencePatientId, ...selectedIds];
    const correlations = await computeOutcomeCorrelations(medic._id, allIds);

    return NextResponse.json({
      matches,
      alignedPairs,
      divergences,
      correlations,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cross-case] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

