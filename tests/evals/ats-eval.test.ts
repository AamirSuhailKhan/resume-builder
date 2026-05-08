import { ATSEngine } from "@/lib/domain/ats/engine";

// Pseudo-test runner for AI Eval Harness
async function runEvals() {
  const sampleResume = "Software Engineer with 5 years experience in React and Node.js. Built scalable web applications.";
  const sampleJob = "Looking for a Senior Frontend Developer with strong React skills and experience in system design.";

  console.log("Running ATS Consistency Eval...");
  
  const results = [];
  for (let i = 0; i < 3; i++) {
    const res = await ATSEngine.analyze(sampleResume, sampleJob);
    results.push(res.atsScore);
  }

  const maxDiff = Math.max(...results) - Math.min(...results);
  console.log(`Scores: ${results.join(", ")}`);
  
  if (maxDiff > 5) {
    console.error("FAIL: ATS Score fluctuated by more than 5 points between runs.");
  } else {
    console.log("PASS: ATS Score is deterministic/consistent.");
  }
}

// In a real environment, we'd hook this into Jest or Vitest.
// runEvals();
