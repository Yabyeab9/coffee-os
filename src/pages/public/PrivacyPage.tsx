import React from 'react';
import { motion } from 'motion/react';
import { Shield } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    content: `We collect information you provide directly to us, such as when you make a reservation, subscribe to our newsletter, or contact us. This includes your name, email address, phone number, and reservation details. We also collect information automatically when you visit our website, including your IP address, browser type, and browsing patterns through cookies and similar technologies.`,
  },
  {
    title: '2. How We Use Your Information',
    content: `We use the information we collect to: process and confirm your reservations; send you transactional emails and important updates; respond to your comments and questions; send promotional communications (with your consent); analyze usage to improve our services; and comply with legal obligations.`,
  },
  {
    title: '3. Information Sharing',
    content: `We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. We may share your information with trusted third parties who assist us in operating our website and serving you, provided they agree to keep this information confidential. We may also release information when required by law.`,
  },
  {
    title: '4. Data Retention',
    content: `We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy, unless a longer retention period is required by law. Reservation data is retained for up to 24 months for operational purposes.`,
  },
  {
    title: '5. Cookies',
    content: `Our website uses cookies to enhance your experience. Essential cookies are required for the website to function properly. Analytics cookies help us understand how visitors interact with our site. You can control cookie settings through your browser preferences. Disabling certain cookies may limit some website functionality.`,
  },
  {
    title: '6. Data Security',
    content: `We implement appropriate technical and organizational security measures to protect your information against unauthorized access, alteration, disclosure, or destruction. However, no method of internet transmission is 100% secure. We use Supabase for data storage, which employs enterprise-grade security including encryption at rest and in transit.`,
  },
  {
    title: '7. Your Rights',
    content: `You have the right to: access the personal data we hold about you; request correction of inaccurate data; request deletion of your personal data (subject to legal requirements); withdraw consent for marketing communications at any time; and lodge a complaint with a relevant data protection authority.`,
  },
  {
    title: '8. Third-Party Services',
    content: `Our website may contain links to third-party websites. We are not responsible for the privacy practices of those sites. We encourage you to read the privacy policies of any third-party services you access through our website. We use Google Maps for location services, subject to Google's privacy policy.`,
  },
  {
    title: "9. Children's Privacy",
    content: `Our services are not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately so we can delete it.`,
  },
  {
    title: '10. Changes to This Policy',
    content: `We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date. Your continued use of our website after any changes constitutes your acceptance of the new policy.`,
  },
  {
    title: '11. Contact Us',
    content: `If you have any questions about this Privacy Policy, please contact us at: hello@origincoffee.et | Origin Coffee, Bole Road, Friendship Square, Addis Ababa, Ethiopia | +251 91 123 4567`,
  },
];

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 py-20">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-4xl font-heading font-bold text-foreground mb-3">Privacy Policy</h1>
          <p className="text-muted-foreground">Last Updated: July 2026</p>
          <p className="text-muted-foreground mt-3 text-sm max-w-prose mx-auto">
            At Origin Coffee, we are committed to protecting your privacy. This policy explains how we collect, use, and safeguard your personal information.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-8">
          {SECTIONS.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass rounded-xl p-6"
            >
              <h2 className="text-base font-heading font-semibold text-foreground mb-3">{section.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
