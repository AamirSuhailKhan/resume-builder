export function getWelcomeEmailHtml(source: string, metadata?: any) {
  const m = metadata || {};
  let discoveryText = "Your high-value analysis is safely backed up.";

  if (source === "ats") {
    const scoreText = m.score ? `a match score of ${m.score}%` : "your personalized ATS analysis";
    const titleText = m.jobTitle ? ` for the ${m.jobTitle} position` : "";
    discoveryText = `You discovered ${scoreText}${titleText}. You now know exactly where your resume matches and how to bypass the filters.`;
  } else if (source === "ctc-decoder" || source === "salary-intelligence") {
    const roleText = m.role || m.roleTitle || "Senior Developer";
    const rangeText = m.ctcRange ? ` (${m.ctcRange})` : "";
    discoveryText = `You unlocked the real-world compensation benchmarks for ${roleText}${rangeText} in India's top tech companies.`;
  } else if (source === "roles-page") {
    const roleText = m.role ? `the ${m.role} role` : "high-demand tech roles";
    discoveryText = `You explored the comprehensive career roadmap and market demand indicators for ${roleText}.`;
  }

  const currentYear = new Date().getFullYear();
  const ctaUrl = `${process.env.AUTH_URL || "http://localhost:3000"}/login?email=${encodeURIComponent(m.email || "")}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CareerOS Results Saved</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="background-color: #f8fafc; padding: 40px 20px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
      <!-- Header Gradient Banner -->
      <tr>
        <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 32px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.025em; font-family: sans-serif;">CareerOS</h1>
          <p style="color: #c7d2fe; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; font-family: sans-serif;">Your Career, Automated</p>
        </td>
      </tr>

      <!-- Content Body -->
      <tr>
        <td style="padding: 40px 32px;">
          <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a; letter-spacing: -0.02em; font-family: sans-serif;">Your CareerOS results are saved 🎯</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">Hi there,</p>
          <p style="font-size: 16px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">Thanks for checking out our career tools. Here's what you just discovered:</p>

          <!-- Discovery Card -->
          <div style="background-color: #eef2ff; border-left: 4px solid #4f46e5; padding: 16px 20px; border-radius: 8px; margin: 0 0 32px 0;">
            <p style="font-size: 15px; line-height: 1.5; font-weight: 600; color: #3730a3; margin: 0; font-family: sans-serif;">${discoveryText}</p>
          </div>

          <p style="font-size: 16px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">CareerOS is India's first fully-autonomous career co-pilot, designed to maximize your shortlists, offer rates, and CTC. Here is what we can do for you:</p>

          <!-- Bullets -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 32px 0;">
            <tr>
              <td style="vertical-align: top; padding: 8px 0;" width="30">
                <span style="font-size: 18px;">⚡</span>
              </td>
              <td style="padding: 8px 0; font-family: sans-serif; font-size: 15px; line-height: 1.5;">
                <strong style="color: #0f172a;">ATS Optimization:</strong>
                <span style="color: #475569;"> Instantly rewrite and tailor resume bullet points to bypass ATS filters with 95%+ precision.</span>
              </td>
            </tr>
            <tr>
              <td style="vertical-align: top; padding: 8px 0;" width="30">
                <span style="font-size: 18px;">📊</span>
              </td>
              <td style="padding: 8px 0; font-family: sans-serif; font-size: 15px; line-height: 1.5;">
                <strong style="color: #0f172a;">Salary Intelligence:</strong>
                <span style="color: #475569;"> Access verified salary, bonus, and stock data from CRED, Swiggy, Razorpay, and 100+ other top startups.</span>
              </td>
            </tr>
            <tr>
              <td style="vertical-align: top; padding: 8px 0;" width="30">
                <span style="font-size: 18px;">🤖</span>
              </td>
              <td style="padding: 8px 0; font-family: sans-serif; font-size: 15px; line-height: 1.5;">
                <strong style="color: #0f172a;">Twin Autonomy:</strong>
                <span style="color: #475569;"> A digital professional twin that actively scans markets, drafts recruiter outreach emails, and helps negotiate.</span>
              </td>
            </tr>
          </table>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 40px 0 20px 0;">
            <a href="${ctaUrl}" style="background-color: #4f46e5; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.15); font-family: sans-serif;">Create your free account → save unlimited results</a>
          </div>
        </td>
      </tr>

      <!-- Divider -->
      <tr>
        <td style="padding: 0 32px;">
          <div style="height: 1px; background-color: #e2e8f0;"></div>
        </td>
      </tr>

      <!-- Footer Benchmarks Tease -->
      <tr>
        <td style="padding: 32px 32px 40px 32px; background-color: #fafafa;">
          <h3 style="font-size: 14px; font-weight: 700; color: #475569; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em; font-family: sans-serif;">Coming up next in your inbox 📬</h3>
          <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin: 0; font-family: sans-serif;">Keep an eye out! In 3 days, we'll send you an exclusive breakdown of SDE2 salary data at Swiggy vs Swiggy vs Razorpay vs CRED, so you know exactly what top companies pay in 2026.</p>
          <div style="margin: 24px 0 0 0; text-align: center; font-size: 12px; color: #94a3b8; font-family: sans-serif;">
            &copy; ${currentYear} CareerOS. All rights reserved.<br />
            Bengaluru, India.
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}
