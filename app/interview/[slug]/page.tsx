import type { Metadata } from "next";
import Link from "next/link";
import { InterviewIntelligenceService } from "@/lib/interview-intelligence/service";

export const dynamic = "force-dynamic";

type SeoQuestionItem = {
  id: string;
  question: {
    title: string;
    prompt: string;
    difficulty: string;
  };
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

function parseSlug(slug: string) {
  const cleaned = slug.replace(/-interview-questions|-questions|-system-design|-oa-questions/g, "");
  const parts = cleaned.split("-").filter(Boolean);
  return {
    company: parts[0] ?? "india",
    role: parts.slice(1).join(" ") || "software engineer",
  };
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { company, role } = parseSlug(slug);
  const title = `${titleCase(company)} ${titleCase(role)} Interview Questions, OA Patterns and Prep Plan`;
  return {
    title,
    description: `Recent ${titleCase(company)} ${titleCase(role)} interview questions, difficulty trends, system design topics, OA patterns, and India-focused preparation roadmap.`,
    alternates: { canonical: `/interview/${slug}` },
    openGraph: {
      title,
      description: `AI interview intelligence for ${titleCase(company)} ${titleCase(role)} candidates in India.`,
      type: "article",
    },
  };
}

export default async function InterviewSeoPage({ params }: PageProps) {
  const { slug } = await params;
  const { company, role } = parseSlug(slug);
  const terminal = await InterviewIntelligenceService.getCompanyTerminal(company, role).catch(() => null);
  const questions = terminal?.topQuestions ?? [];
  const prepPlan = terminal?.prepPlan;
  const prediction = terminal?.prediction;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (questions as SeoQuestionItem[]).slice(0, 8).map((item) => ({
      "@type": "Question",
      name: item.question.title,
      acceptedAnswer: {
        "@type": "Answer",
        text: `Prepare by understanding the pattern, constraints, edge cases, and interviewer expectations. Difficulty: ${item.question.difficulty}.`,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container-premium py-10">
        <Link href="/interview-ai" className="text-sm text-accent hover:underline">Open InterviewAI</Link>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-normal">
          {titleCase(company)} {titleCase(role)} Interview Questions
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
          AI-generated summary from CareerOS interview intelligence: repeated questions, OA patterns, difficulty, selection probability, and preparation roadmap for India candidates.
        </p>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Stat label="Selection probability" value={`${Math.round((prediction?.selectionProbability ?? 0.5) * 100)}%`} />
          <Stat label="Interview difficulty" value={`${Math.round((prediction?.interviewDifficulty ?? 0.5) * 100)}%`} />
          <Stat label="Prep timeline" value={`${prepPlan?.weeks ?? 4} weeks`} />
        </section>

        <section className="mt-8 rounded-lg border border-border bg-surface p-5">
          <h2 className="text-xl font-semibold">Most Asked Questions</h2>
          <div className="mt-4 grid gap-3">
            {(questions as SeoQuestionItem[]).slice(0, 12).map((item) => (
              <article key={item.id} className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm font-medium">{item.question.title}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.question.prompt}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-border bg-surface p-5">
          <h2 className="text-xl font-semibold">Preparation Roadmap</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
            {(prepPlan?.focus ?? ["Practice DSA patterns", "Prepare behavioral stories", "Run a mock interview"]).map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
