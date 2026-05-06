import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · jakobpreneur Command Center",
  description:
    "Privacy Policy for the jakobpreneur Command Center creator platform.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-zinc-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-zinc-500 mb-10">Last updated: May 5, 2026</p>

      <div className="prose prose-zinc max-w-none text-sm text-zinc-700 space-y-6 leading-relaxed">
        <Section title="1. Introduction">
          <p>
            This Privacy Policy describes how jakobpreneur Command Center
            (&quot;the Platform&quot;, &quot;we&quot;, &quot;us&quot;, or
            &quot;our&quot;), operated by Jakob Rubenstein, collects, uses,
            shares, and protects information when you use the Platform. By
            using the Platform you agree to this Policy. If you do not agree,
            please do not use the Platform.
          </p>
          <p>
            The Platform is a creator tool that helps social media creators
            generate captions, hashtags, and visual content and publish it to
            third-party platforms including TikTok, Instagram, YouTube, and X
            (the &quot;Connected Platforms&quot;).
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We collect the following categories of information:</p>
          <p>
            <strong>a. Information you provide.</strong> Content you upload or
            generate through the Platform, including scripts, captions,
            hashtags, image and video files, scheduling preferences, and any
            information you submit through forms or contact channels.
          </p>
          <p>
            <strong>b. Connected Platform data.</strong> When you authenticate
            with a Connected Platform via OAuth, we receive an access token
            scoped to the permissions you grant. We may receive limited
            account-identifying information (such as account ID, display name,
            handle, profile image, and basic publishing-related metadata) and,
            for some platforms, post-level engagement data (impressions,
            views, likes, comments) that you have authorized us to access.
          </p>
          <p>
            <strong>c. Usage and technical data.</strong> Standard server logs
            including IP address, user-agent, request paths, and timestamps,
            used for security and operational monitoring.
          </p>
          <p>
            <strong>d. Cookies and similar technologies.</strong> We use
            functional cookies to maintain your authenticated session. We do
            not use third-party advertising cookies or sell your data.
          </p>
        </Section>

        <Section title="3. How We Use Information">
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>operate, maintain, and provide features of the Platform;</li>
            <li>
              authenticate you to Connected Platforms and publish content to
              your account at your direction;
            </li>
            <li>
              generate AI-assisted captions, hashtags, scripts, and image
              assets based on inputs you provide;
            </li>
            <li>
              display your historical posts and engagement metrics in your
              dashboard;
            </li>
            <li>
              detect, prevent, and respond to fraud, security incidents, and
              violations of our Terms of Service;
            </li>
            <li>comply with legal obligations and enforce our rights.</li>
          </ul>
        </Section>

        <Section title="4. TikTok Data Handling">
          <p>
            When you connect a TikTok account, we receive an OAuth access token
            with the scopes you authorize. We use TikTok data solely to (a)
            publish content to your TikTok account at your direction, (b)
            display your authenticated TikTok username and profile information
            in your dashboard, and (c) where authorized, display engagement
            data (such as views, likes, and comments) on posts published
            through the Platform.
          </p>
          <p>
            We do not sell, rent, or share TikTok data with third parties. We
            do not use TikTok data for advertising or to build user profiles
            for any purpose other than providing the Platform&apos;s features
            to you. TikTok data is retained only as long as needed to provide
            those features and is deleted upon disconnection or account
            deletion as described in Section 7.
          </p>
          <p>
            You may disconnect TikTok at any time from{" "}
            <a
              href="https://www.tiktok.com/setting/apps-and-website-management"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              TikTok&apos;s Apps and Website Management page
            </a>
            . Disconnection revokes our access token and stops further data
            collection.
          </p>
        </Section>

        <Section title="5. How We Share Information">
          <p>
            We do not sell your personal information. We share information
            only in these limited circumstances:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>With Connected Platforms</strong> when you direct us to
              publish content or otherwise act on your behalf (for example,
              uploading a video to YouTube or a carousel to Instagram).
            </li>
            <li>
              <strong>With service providers</strong> that operate our
              infrastructure and tooling, including Vercel (hosting), Airtable
              (data storage), Anthropic (AI text generation), and OpenAI (AI
              image generation). These providers process information on our
              behalf under contractual confidentiality and security
              obligations.
            </li>
            <li>
              <strong>To comply with law</strong> or respond to valid legal
              process, or to protect the rights, safety, or property of the
              Platform, its operator, or others.
            </li>
            <li>
              <strong>In a business transfer</strong> such as a merger,
              acquisition, or sale of assets, subject to standard
              confidentiality protections.
            </li>
          </ul>
        </Section>

        <Section title="6. Data Storage and Security">
          <p>
            We store Platform data with reputable third-party providers,
            including Airtable for content metadata and Vercel Blob for
            generated media. OAuth access tokens are stored encrypted at rest
            and transmitted over HTTPS. We implement reasonable
            administrative, technical, and physical safeguards designed to
            protect information from unauthorized access, alteration,
            disclosure, or destruction. No method of transmission or storage
            is 100% secure, and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="7. Data Retention and Deletion">
          <p>
            We retain Platform data only as long as needed to provide the
            services described in this Policy or to comply with legal
            obligations. You may request deletion of your data at any time by
            emailing{" "}
            <a
              href="mailto:Jrubenstein313@gmail.com"
              className="underline"
            >
              Jrubenstein313@gmail.com
            </a>
            . Upon a verified deletion request we will delete or anonymize
            data associated with your account within 30 days, except where
            retention is required by law.
          </p>
          <p>
            Disconnecting a Connected Platform from within that platform&apos;s
            settings revokes our OAuth token. Data previously received from
            that platform will be deleted from our active systems within 30
            days.
          </p>
        </Section>

        <Section title="8. Your Rights">
          <p>
            Depending on your jurisdiction, you may have rights regarding your
            personal information, including the right to:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>access the personal information we hold about you;</li>
            <li>correct inaccurate or incomplete information;</li>
            <li>request deletion of your personal information;</li>
            <li>
              object to or restrict certain processing of your personal
              information;
            </li>
            <li>
              receive a portable copy of information you provided to us;
            </li>
            <li>
              withdraw consent where processing is based on consent.
            </li>
          </ul>
          <p>
            To exercise any of these rights, email{" "}
            <a
              href="mailto:Jrubenstein313@gmail.com"
              className="underline"
            >
              Jrubenstein313@gmail.com
            </a>
            . We may need to verify your identity before responding.
          </p>
        </Section>

        <Section title="9. California Privacy Rights (CCPA / CPRA)">
          <p>
            California residents may exercise rights under the California
            Consumer Privacy Act, including the right to know, delete, correct,
            and limit the use of sensitive personal information, and the right
            to non-discrimination for exercising those rights. We do not sell
            personal information and do not share it for cross-context
            behavioral advertising.
          </p>
        </Section>

        <Section title="10. European Economic Area / United Kingdom (GDPR)">
          <p>
            If you are located in the EEA or UK, our legal bases for
            processing personal data are: (a) performance of a contract with
            you, (b) our legitimate interests in operating and securing the
            Platform, (c) compliance with legal obligations, and (d) your
            consent where applicable. You have the right to lodge a complaint
            with your local data protection authority.
          </p>
        </Section>

        <Section title="11. Children&apos;s Privacy">
          <p>
            The Platform is not directed to children under 13, and we do not
            knowingly collect personal information from children under 13. If
            we learn we have collected information from a child under 13, we
            will delete it. If you believe a child has provided us
            information, please contact us immediately.
          </p>
        </Section>

        <Section title="12. International Data Transfers">
          <p>
            The Platform is operated from the United States, and our service
            providers may process data in the United States and other
            jurisdictions. By using the Platform, you understand that your
            information may be transferred to and processed in countries
            other than your own. Where required, we use appropriate safeguards
            for international transfers.
          </p>
        </Section>

        <Section title="13. Third-Party Links and Services">
          <p>
            The Platform may link to or interact with third-party services,
            including TikTok, Instagram, YouTube, and X. Their handling of
            your information is governed by their own privacy policies, which
            we encourage you to review.
          </p>
        </Section>

        <Section title="14. Changes to this Policy">
          <p>
            We may update this Privacy Policy from time to time. When we do,
            we will revise the &quot;Last updated&quot; date at the top of this
            page. If changes are material we will make reasonable efforts to
            notify you. Your continued use of the Platform after an update
            constitutes acceptance of the revised Policy.
          </p>
        </Section>

        <Section title="15. Contact">
          <p>
            For questions about this Privacy Policy or to exercise any of your
            rights, contact us at{" "}
            <a
              href="mailto:Jrubenstein313@gmail.com"
              className="underline"
            >
              Jrubenstein313@gmail.com
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-zinc-900 mb-2 mt-8">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
