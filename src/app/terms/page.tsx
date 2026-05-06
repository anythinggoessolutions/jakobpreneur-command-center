import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · jakobpreneur Command Center",
  description:
    "Terms of Service for the jakobpreneur Command Center creator platform.",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-zinc-900 mb-2">
        Terms of Service
      </h1>
      <p className="text-sm text-zinc-500 mb-10">
        Last updated: May 5, 2026
      </p>

      <div className="prose prose-zinc max-w-none text-sm text-zinc-700 space-y-6 leading-relaxed">
        <Section title="1. Acceptance of Terms">
          <p>
            These Terms of Service (&quot;Terms&quot;) form a binding agreement
            between you (&quot;you&quot;, &quot;your&quot;, or &quot;User&quot;)
            and jakobpreneur Command Center (&quot;the Platform&quot;,
            &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), operated by
            Jakob Rubenstein. By accessing or using the Platform, you agree to
            be bound by these Terms and our{" "}
            <a href="/privacy" className="underline">
              Privacy Policy
            </a>
            . If you do not agree to these Terms, you must not access or use the
            Platform.
          </p>
        </Section>

        <Section title="2. Description of the Platform">
          <p>
            jakobpreneur Command Center is a creator platform that helps social
            media creators plan, generate, optimize, and publish short-form
            video content. The Platform provides tools for AI-assisted caption
            and hashtag generation, image carousel rendering, content
            scheduling, and authenticated publishing to third-party social
            media platforms including TikTok, Instagram, YouTube, and X
            (collectively, &quot;Connected Platforms&quot;).
          </p>
        </Section>

        <Section title="3. Eligibility">
          <p>
            You must be at least 18 years old (or the age of majority in your
            jurisdiction) to use the Platform. By using the Platform, you
            represent that you have the legal capacity to enter into a binding
            agreement and that your use of the Platform does not violate any
            applicable law.
          </p>
        </Section>

        <Section title="4. Accounts and Connected Platforms">
          <p>
            To use core Platform features, you may be required to authenticate
            with one or more Connected Platforms via OAuth. You authorize the
            Platform to access, store, and use authentication tokens and the
            scopes you grant solely for the purpose of providing the Platform
            services to you (for example, publishing content to your account on
            your behalf).
          </p>
          <p>
            You are responsible for maintaining the confidentiality of your
            credentials and for all activity occurring under your account. You
            agree to notify us immediately of any unauthorized use. You may
            revoke our access to any Connected Platform at any time through the
            settings of that Connected Platform.
          </p>
        </Section>

        <Section title="5. Acceptable Use">
          <p>You agree that you will not, and will not permit anyone else to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              use the Platform to publish content that is unlawful, harassing,
              hateful, sexually explicit, defamatory, deceptive, or otherwise
              violates the community guidelines or terms of any Connected
              Platform;
            </li>
            <li>
              use the Platform to impersonate any person or entity, or
              misrepresent your affiliation with a person or entity;
            </li>
            <li>
              use the Platform to publish content that infringes any patent,
              trademark, copyright, trade secret, or other proprietary right of
              any third party;
            </li>
            <li>
              attempt to interfere with, disrupt, reverse engineer, or gain
              unauthorized access to the Platform, its servers, or any
              Connected Platform;
            </li>
            <li>
              use the Platform to send unsolicited communications, spam, or
              automated mass posting in violation of any Connected Platform&apos;s
              policies;
            </li>
            <li>
              use the Platform in any manner that violates any applicable law
              or regulation, including export control, anti-spam, and data
              protection laws.
            </li>
          </ul>
        </Section>

        <Section title="6. User Content">
          <p>
            &quot;User Content&quot; means any text, scripts, images,
            audio, video, captions, hashtags, or other material you create,
            upload, or generate through the Platform.
          </p>
          <p>
            You retain all ownership rights to your User Content. By
            submitting User Content to the Platform, you grant us a
            non-exclusive, worldwide, royalty-free license to host, store,
            process, transmit, and display the User Content solely as needed to
            operate the Platform and to publish that content to the Connected
            Platforms you direct.
          </p>
          <p>
            You are solely responsible for your User Content and represent
            that you have all rights necessary to submit it to the Platform
            and to publish it on the Connected Platforms you select.
          </p>
        </Section>

        <Section title="7. AI-Generated Output">
          <p>
            The Platform uses third-party artificial intelligence models to
            assist with generating captions, hashtags, scripts, and image
            assets. AI-generated output may be inaccurate, incomplete, or
            unsuitable for your intended use. You are responsible for
            reviewing and approving all AI-generated output before
            publishing. The Platform makes no warranty as to the accuracy or
            fitness of AI-generated output.
          </p>
        </Section>

        <Section title="8. Third-Party Services and Connected Platforms">
          <p>
            The Platform integrates with third-party services including, but
            not limited to, TikTok, Instagram (Meta), YouTube (Google), and X.
            Your use of any Connected Platform is governed by that
            platform&apos;s own terms of service and privacy policy, including:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <a
                href="https://www.tiktok.com/legal/terms-of-service"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                TikTok Terms of Service
              </a>
            </li>
            <li>
              <a
                href="https://help.instagram.com/581066165581870"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram Terms of Use
              </a>
            </li>
            <li>
              <a
                href="https://www.youtube.com/t/terms"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                YouTube Terms of Service
              </a>
            </li>
            <li>
              <a
                href="https://twitter.com/en/tos"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                X Terms of Service
              </a>
            </li>
          </ul>
          <p>
            We are not responsible for the availability, content, or practices
            of any Connected Platform. The presence of an integration is not
            an endorsement.
          </p>
        </Section>

        <Section title="9. Intellectual Property">
          <p>
            All Platform software, branding, designs, and underlying technology
            are owned by us or our licensors and are protected by intellectual
            property laws. Except for the limited rights expressly granted in
            these Terms, no rights are granted to you in the Platform.
          </p>
        </Section>

        <Section title="10. Termination">
          <p>
            We may suspend or terminate your access to the Platform at any
            time, with or without cause and with or without notice, including
            for any violation of these Terms. You may stop using the Platform
            at any time and may revoke OAuth access to Connected Platforms
            through the relevant platform&apos;s settings. Upon termination,
            sections of these Terms that by their nature should survive
            (including User Content licenses, disclaimers, limitation of
            liability, and indemnification) will remain in effect.
          </p>
        </Section>

        <Section title="11. Disclaimers">
          <p>
            THE PLATFORM IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS
            AVAILABLE&quot; BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER
            EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
            NON-INFRINGEMENT, OR THAT THE PLATFORM WILL BE UNINTERRUPTED OR
            ERROR-FREE. WE DO NOT WARRANT THAT CONTENT WILL BE PUBLISHED,
            DELIVERED, OR DISPLAYED ON ANY CONNECTED PLATFORM.
          </p>
        </Section>

        <Section title="12. Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL
            WE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL,
            OR EXEMPLARY DAMAGES, OR FOR LOSS OF PROFITS, REVENUE, GOODWILL,
            OR DATA, ARISING OUT OF OR RELATING TO YOUR USE OF THE PLATFORM,
            EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS WILL
            NOT EXCEED ONE HUNDRED U.S. DOLLARS (USD $100).
          </p>
        </Section>

        <Section title="13. Indemnification">
          <p>
            You agree to defend, indemnify, and hold harmless the Platform and
            its operator from any claim, demand, damages, or expense
            (including reasonable attorneys&apos; fees) arising from (a) your
            User Content, (b) your use of the Platform, (c) your violation of
            these Terms, or (d) your violation of any third-party right,
            including any Connected Platform&apos;s terms.
          </p>
        </Section>

        <Section title="14. Changes to These Terms">
          <p>
            We may modify these Terms at any time by posting the updated
            Terms on this page and updating the &quot;Last updated&quot; date.
            Your continued use of the Platform after the update constitutes
            acceptance of the modified Terms. If a change is material, we will
            make reasonable efforts to notify you in advance.
          </p>
        </Section>

        <Section title="15. Governing Law and Disputes">
          <p>
            These Terms are governed by the laws of the State of New York,
            United States, without regard to its conflict-of-laws principles.
            Any dispute arising out of or relating to these Terms or the
            Platform will be resolved exclusively in the state or federal
            courts located in New York County, New York, and you consent to
            the personal jurisdiction of those courts.
          </p>
        </Section>

        <Section title="16. Contact">
          <p>
            For questions about these Terms, contact us at{" "}
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
