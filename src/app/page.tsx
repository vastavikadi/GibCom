import { Metadata } from 'next';
import { LandingNav } from '@/components/landing/nav';
import { LandingHero } from '@/components/landing/hero';
import { LandingLogos } from '@/components/landing/logos';
import { LandingProblem } from '@/components/landing/problem';
import { LandingPlayground } from '@/components/landing/playground';
import { LandingDimensions } from '@/components/landing/dimensions';
import { LandingComparison } from '@/components/landing/comparison';
import { LandingSecurity } from '@/components/landing/security';
import { LandingROI } from '@/components/landing/roi';
import { LandingTestimonials } from '@/components/landing/testimonials';
import { LandingPricing } from '@/components/landing/pricing';
import { LandingFAQ } from '@/components/landing/faq';
import { LandingFooter } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'GibCom — Ship faster than your standup',
  description:
    'Anchor every pull request, Slack debate, Jira ticket, and RFC across your whole organization before your team even starts their daily sync. Powered by Meta AI Muse-Spark & pgvector.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white selection:bg-[#c6f432] selection:text-[#0b0b0c]">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingLogos />
        <LandingProblem />
        <LandingPlayground />
        <LandingDimensions />
        <LandingComparison />
        <LandingSecurity />
        <LandingROI />
        <LandingTestimonials />
        <LandingPricing />
        <LandingFAQ />
      </main>
      <LandingFooter />
    </div>
  );
}
