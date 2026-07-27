import dotenv from "dotenv";
dotenv.config();

const mongoose = (await import("mongoose")).default;
const Memory = (await import("../modules/memory/Memory.model.js")).default;
const { getModelWithKey } = await import("../core/utils/keyManager.js");

const MEMORY_MODEL = 'gemini-3.1-flash-lite';
const confirm = process.argv.includes("--confirm");

const buildBulkReconciliationPrompt = (memories) => `
You are an expert memory reconciliation assistant. Analyze the user's current list of memories below. Identify any duplicate, redundant, or contradictory memories, and suggest updates or deletions to make the list clean, accurate, and consistent.

Memories:
${memories.map((m, i) => `${i}: [ID: ${m._id}] "${m.content}"`).join('\n')}

Critical Reasoning Rules:
1. Identify if two or more memories describe the SAME underlying real-world data point (e.g. a date, graduation timeline, degree, job title, role, location, tool preference), regardless of surface phrasing.
2. If two memories make conflicting claims about the same attribute (e.g. "Expected graduation date is December 2026" vs "Enrolled from Dec 2022 to May 2026"), keep/prefer the NEWER or more specific one (higher index) and suggest deleting or replacing the outdated memory.
3. If a memory is a subset of another fuller memory (e.g. "MERN developer" vs "MERN developer and AI Integration Specialist"), merge into the fuller version or delete the subset.
4. Standalone Negations: If any memory is phrased as a negation with no positive fact (e.g. "No longer prefers X"), suggest deleting it.
5. Non-personal/Noise: Delete non-personal noise.

Return ONLY a valid JSON object matching this schema:
{
  "deletions": ["<memoryId>", ...],
  "replacements": [
    { "id": "<memoryId>", "newContent": "<cleaned positive-phrased fact>" }
  ]
}

If no actions are needed, return:
{
  "deletions": [],
  "replacements": []
}

Return ONLY valid JSON, no markdown, no explanation.
`.trim();


const run = async () => {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/novamind";
  console.log("Connecting to MongoDB:", mongoUri);
  await mongoose.connect(mongoUri);

  try {
    // 1. Group memories by userId
    console.log("Fetching all memories from DB...");
    const allMemories = await Memory.find({}).sort({ createdAt: 1 }).lean();
    console.log(`Found ${allMemories.length} total memories in DB.`);

    const userGroups = {};
    for (const mem of allMemories) {
      const uidStr = mem.userId.toString();
      if (!userGroups[uidStr]) {
        userGroups[uidStr] = [];
      }
      userGroups[uidStr].push(mem);
    }

    const uids = Object.keys(userGroups);
    console.log(`Grouped into ${uids.length} unique users.`);

    let totalDeletions = 0;
    let totalReplacements = 0;

    for (const uid of uids) {
      const memories = userGroups[uid];
      console.log(`\n----------------------------------------`);
      console.log(`Processing User ID: ${uid} (${memories.length} memories)`);

      if (memories.length <= 1) {
        console.log("User has 1 or 0 memories. Skipping reconciliation.");
        continue;
      }

      // Format user memories to print them out
      memories.forEach((m, idx) => {
        console.log(`  ${idx}: [ID: ${m._id}] "${m.content}"`);
      });

      // Call LLM for bulk reconciliation recommendations
      try {
        const { model, reportSuccess, reportFailure } = getModelWithKey(MEMORY_MODEL);
        const result = await model.generateContent(buildBulkReconciliationPrompt(memories));
        reportSuccess();

        const rawText = result.response.text().trim();
        const cleanJson = rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/, '')
          .trim();

        const decision = JSON.parse(cleanJson);
        const { deletions = [], replacements = [] } = decision;

        console.log(`\nReconciliation Recommendations:`);
        console.log(`  Deletions to make:`, deletions);
        console.log(`  Replacements to make:`, replacements);

        totalDeletions += deletions.length;
        totalReplacements += replacements.length;

        if (confirm) {
          // Perform Deletions
          if (deletions.length > 0) {
            await Memory.deleteMany({ _id: { $in: deletions } });
            console.log(`  [CONFIRM] Deleted ${deletions.length} memories from DB.`);
          }

          // Perform Replacements
          for (const rep of replacements) {
            await Memory.findByIdAndUpdate(rep.id, { content: rep.newContent });
            console.log(`  [CONFIRM] Updated memory ${rep.id} -> "${rep.newContent}"`);
          }
        } else {
          console.log(`  [DRY-RUN] No database modifications made. Run with --confirm to apply.`);
        }

      } catch (err) {
        console.error(`  Error reconciling memories for user ${uid}:`, err.message);
      }
    }

    console.log(`\n========================================`);
    console.log(`Migration Complete.`);
    console.log(`Total recommended deletions: ${totalDeletions}`);
    console.log(`Total recommended replacements: ${totalReplacements}`);
    if (!confirm) {
      console.log(`*** DRY-RUN ONLY. Run: 'node scripts/reconcile_memories.js --confirm' to save changes. ***`);
    } else {
      console.log(`*** CONFIRMED RUN. Database changes successfully applied. ***`);
    }

  } catch (err) {
    console.error("Migration fatal error:", err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
