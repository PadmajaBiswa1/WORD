const templates = [
  {
    id: 'blank',
    title: 'Blank Document',
    category: 'General',
    description: 'Start with a clean page.',
    content: '<p></p>',
  },
  {
    id: 'business',
    title: 'Business Report',
    category: 'Business',
    description: 'Executive summary, findings, and recommendations.',
    content: `
<h1>Strategic Business Report</h1>
<p><strong>Prepared by:</strong> Your Name</p>
<p><strong>Prepared for:</strong> Client or Department</p>
<h2>Executive Summary</h2>
<p>Summarize the purpose, key findings, and recommended next steps.</p>
<h2>Objectives</h2>
<ul>
  <li>Primary objective</li>
  <li>Success metric</li>
  <li>Timeline</li>
</ul>
<h2>Findings</h2>
<p>Present evidence, risks, and opportunities.</p>
<h2>Recommendations</h2>
<ol>
  <li><strong>Recommendation one</strong> - rationale and impact.</li>
  <li><strong>Recommendation two</strong> - rationale and impact.</li>
</ol>`,
  },
  {
    id: 'letter',
    title: 'Professional Letter',
    category: 'Business',
    description: 'A polished formal letter layout.',
    content: `
<p><strong>Your Full Name</strong></p>
<p>Your Address, City, State ZIP</p>
<p>your@email.com - (555) 000-0000</p>
<p><strong>Recipient Name</strong><br>Title or Organization<br>Recipient Address</p>
<p>Dear Recipient,</p>
<p>State the purpose of your letter clearly and professionally.</p>
<p>Provide supporting details, dates, and any requested action.</p>
<p>Sincerely,</p>
<p><strong>Your Full Name</strong></p>`,
  },
  {
    id: 'resume',
    title: 'Resume',
    category: 'Career',
    description: 'A clean resume structure with summary, experience, and skills.',
    content: `
<h1>Your Full Name</h1>
<p><strong>Role or Professional Title</strong></p>
<p>email@example.com - (555) 000-0000 - City, State</p>
<h2>Professional Summary</h2>
<p>Summarize your experience, strengths, and target role.</p>
<h2>Experience</h2>
<p><strong>Job Title</strong> - Company Name</p>
<ul>
  <li>Achievement with measurable outcome.</li>
  <li>Project, leadership, or collaboration highlight.</li>
</ul>
<h2>Education</h2>
<p>Degree - School Name</p>
<h2>Skills</h2>
<p>Skill 1 - Skill 2 - Skill 3</p>`,
  },
  {
    id: 'proposal',
    title: 'Project Proposal',
    category: 'Business',
    description: 'Scope, timeline, budget, and expected outcomes.',
    content: `
<h1>Project Proposal</h1>
<p><strong>Prepared by:</strong> Your Name</p>
<p><strong>Submitted to:</strong> Client or Team</p>
<h2>Overview</h2>
<p>Describe the project and why it matters.</p>
<h2>Problem Statement</h2>
<p>Define the problem, gap, or opportunity.</p>
<h2>Proposed Solution</h2>
<p>Explain the approach and expected value.</p>
<h2>Scope of Work</h2>
<ul>
  <li>Deliverable one</li>
  <li>Deliverable two</li>
  <li>Out of scope items</li>
</ul>
<h2>Timeline and Budget</h2>
<p>List milestones, dates, and estimated costs.</p>`,
  },
  {
    id: 'invoice',
    title: 'Invoice',
    category: 'Finance',
    description: 'Simple invoice with bill-to details and line items.',
    content: `
<h1>Invoice</h1>
<p><strong>Invoice No.:</strong> INV-2026-001</p>
<p><strong>Bill To:</strong> Client Name</p>
<table>
  <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
  <tbody>
    <tr><td>Service or product</td><td>1</td><td>$100.00</td><td>$100.00</td></tr>
  </tbody>
</table>
<p><strong>Total Due:</strong> $100.00</p>
<p>Payment due within 30 days. Thank you for your business.</p>`,
  },
];

function listTemplates() {
  return templates.map(({ content, ...template }) => template);
}

function getTemplate(id) {
  return templates.find((template) => template.id === id) || null;
}

module.exports = {
  getTemplate,
  listTemplates,
};
