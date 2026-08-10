import { Link } from 'react-router-dom';
import GrowLeadsLogo from '../components/GrowLeadsLogo';

/**
 * Terms of Service and Privacy Policy.
 *
 * The content describes what the product actually does today (see the
 * sub-processor list — it matches the services the backend really calls).
 * Anything in [SQUARE BRACKETS] is a placeholder that must be filled in with
 * the operating company's real details, and the whole document should be
 * reviewed by a lawyer before it is relied on.
 */

const COMPANY = '[LEGAL COMPANY NAME]';
const ADDRESS = '[REGISTERED ADDRESS]';
const JURISDICTION = '[CITY, INDIA]';
const CONTACT = 'contact.vishal22@gmail.com';
const UPDATED = '9 August 2026';

function Shell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-[#080C18] text-slate-100">
      <header className="border-b border-white/8">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/"><GrowLeadsLogo size="md" /></Link>
          <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black tracking-tight text-white font-display">{title}</h1>
        <p className="text-sm text-slate-400 mt-2">{subtitle}</p>
        <p className="text-[11px] text-slate-500 mt-1">Last updated: {UPDATED}</p>

        <div className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4">
          <p className="text-[11px] text-amber-300 leading-relaxed">
            <strong>Draft:</strong> details in [square brackets] still need to be completed by {COMPANY}, and this
            document should be reviewed by a qualified lawyer before launch.
          </p>
        </div>

        <div className="mt-10 space-y-8 text-[13px] leading-relaxed text-slate-300">{children}</div>

        <div className="mt-14 pt-8 border-t border-white/8 flex gap-6">
          <Link to="/terms" className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-white">Terms</Link>
          <Link to="/privacy" className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-white">Privacy</Link>
          <a href={`mailto:${CONTACT}`} className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-white">Contact</a>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-black uppercase tracking-widest text-blue-400">{title}</h2>
      {children}
    </section>
  );
}

export function Terms() {
  return (
    <Shell title="Terms of Service" subtitle="The agreement between you and GrowLeadz.">
      <Section title="1. Who we are">
        <p>
          GrowLeadz (“the Service”) is operated by {COMPANY}, {ADDRESS}. By creating an account you agree to these
          terms. If you do not agree, do not use the Service.
        </p>
      </Section>

      <Section title="2. What the Service does">
        <p>
          GrowLeadz automates outreach on LinkedIn accounts that <em>you</em> connect: sending connection requests,
          viewing profiles, liking posts, sending messages and follow-ups on a schedule you configure, and collecting
          the replies into one inbox. It also imports prospect lists from LinkedIn search URLs or CSV files you provide.
        </p>
      </Section>

      <Section title="3. Your LinkedIn accounts and your responsibility">
        <p>
          You are responsible for the LinkedIn accounts you connect and for the messages you send through them.
          Automating activity on LinkedIn is <strong>not permitted by LinkedIn's User Agreement</strong>, and LinkedIn
          may warn, restrict or permanently ban accounts that it detects as automated.
        </p>
        <p>
          We apply pacing limits, per-account daily caps, working-hour windows and warmup ramps to reduce that risk,
          but <strong>we cannot and do not guarantee that your accounts will not be restricted or banned</strong>. You
          accept that risk when you connect an account.
        </p>
        <p>
          You must not use the Service to send unlawful, deceptive, harassing or spam content, to impersonate anyone,
          or to contact people in ways that break the law that applies to you or to them.
        </p>
      </Section>

      <Section title="4. Prospect data you import">
        <p>
          When you import prospects you remain responsible for having a lawful basis to hold and contact them. In data
          protection terms you are the controller of that data and we process it on your behalf, only to run the
          campaigns you configure.
        </p>
      </Section>

      <Section title="5. Plans, payment and cancellation">
        <p>
          Plan limits (number of connected LinkedIn accounts and campaigns) are shown on the pricing page and enforced
          in the product. Introductory pricing applies to the first 30 days of a new subscription. Subscriptions renew
          until cancelled, and you can cancel at any time from the billing page; access continues to the end of the
          period you have paid for. [Add refund policy — currently none is stated.]
        </p>
      </Section>

      <Section title="6. Availability">
        <p>
          We aim to keep the Service running continuously but we do not offer a guaranteed uptime level. The Service
          depends on third parties (see the Privacy Policy); if one of them is unavailable, parts of the Service may
          pause until it returns. Scheduled actions resume automatically.
        </p>
      </Section>

      <Section title="7. Liability">
        <p>
          To the extent permitted by law, {COMPANY} is not liable for indirect or consequential losses, including lost
          revenue or lost opportunities, and our total liability is limited to the amount you paid us in the twelve
          months before the claim. Nothing here excludes liability that cannot be excluded by law. [Confirm wording
          with a lawyer.]
        </p>
      </Section>

      <Section title="8. Ending your account">
        <p>
          You can delete your account at any time from the settings page. We may suspend or end an account that
          breaches these terms, or where required by law or by a third party we depend on.
        </p>
      </Section>

      <Section title="9. Changes and governing law">
        <p>
          We may update these terms; material changes will be notified by email to the address on your account. These
          terms are governed by the laws of {JURISDICTION}, and the courts there have exclusive jurisdiction.
        </p>
        <p>Questions: <a className="text-blue-400 hover:text-blue-300" href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
      </Section>
    </Shell>
  );
}

export function Privacy() {
  return (
    <Shell title="Privacy Policy" subtitle="What we collect, why, and who else sees it.">
      <Section title="1. Data you give us">
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Account details</strong> — name, work email, company name, website, job title, password (stored only as a bcrypt hash), time zone.</li>
          <li><strong>Campaign content</strong> — the message templates, sequences, schedules and offer descriptions you configure.</li>
          <li><strong>Prospect data you import</strong> — name, headline, company, job title, location, LinkedIn profile URL and public profile details, from a LinkedIn search URL or a CSV you upload.</li>
          <li><strong>Conversations</strong> — messages sent through the Service and the replies received, so they can be shown in your inbox.</li>
          <li><strong>Billing details</strong> — handled by our payment provider; we store the subscription status and plan, not your card number.</li>
        </ul>
      </Section>

      <Section title="2. Your connected LinkedIn accounts">
        <p>
          Connecting a LinkedIn account creates an authenticated session held by our provider Unipile, which performs
          the actions your campaigns request. We store the identifier of that connection, the profile name and photo,
          and its activity counters — we never see or store your LinkedIn password.
        </p>
      </Section>

      <Section title="3. Sub-processors">
        <p>These are the third parties that process data as part of running the Service:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Unipile</strong> — LinkedIn connectivity: sends invites and messages, retrieves relations and conversations.</li>
          <li><strong>NVIDIA NIM</strong> — generates personalised message text and lead scores. Prospect profile details and your offer description are sent for this purpose.</li>
          <li><strong>Brevo</strong> — transactional email (verification codes, password resets, digests).</li>
          <li><strong>Railway</strong> — hosting and database storage.</li>
          <li><strong>Google Analytics</strong> — anonymous usage statistics on the public website.</li>
          <li><strong>[Payment provider — to be added once billing is live].</strong></li>
        </ul>
        <p>We do not sell your data or your prospects' data, and we do not use it to train our own models.</p>
      </Section>

      <Section title="4. Optional integrations you control">
        <p>
          If you enable a Slack alert or an outbound webhook, lead details and reply text are sent to the URL you
          provide. Those destinations are outside our control.
        </p>
      </Section>

      <Section title="5. Where data is stored and how long">
        <p>
          Data is stored on our hosting provider's infrastructure. We keep it while your account is active. When you
          delete a lead or a campaign it is removed immediately, including its activity history. When you delete your
          account we remove your data within [30] days, except records we must keep for tax or legal reasons.
        </p>
      </Section>

      <Section title="6. Your rights">
        <p>
          You can access, correct, export or delete your data from the product, or by writing to us. If you are in a
          region with data protection rights (such as the EU or UK) you can also object to processing or ask us to
          restrict it. Prospects whose data you imported can contact you as the controller, and we will help you
          respond.
        </p>
      </Section>

      <Section title="7. Security">
        <p>
          Passwords are hashed, sensitive credentials are encrypted at rest, access to the production system is limited
          to [NAMED ROLES], and traffic is served over HTTPS. No system is perfectly secure; if a breach affects your
          data we will notify you without undue delay.
        </p>
      </Section>

      <Section title="8. Cookies">
        <p>
          The app uses local storage to keep you signed in. The public website uses Google Analytics cookies to measure
          traffic. [Add a consent banner before marketing to EU/UK visitors.]
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          {COMPANY}, {ADDRESS} — <a className="text-blue-400 hover:text-blue-300" href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>
      </Section>
    </Shell>
  );
}
