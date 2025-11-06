import React from 'react';
import { Link } from 'react-router-dom';
import { MdOutlinePolicy } from "react-icons/md";
import '../styles/TermsAndConditions.css';

const TermsAndConditions = () => {
  return (
    <div className="terms-container">
      <div className="terms-content">
        <div className="terms-header">
          <MdOutlinePolicy className="terms-icon" />
          <h1>Terms & Conditions</h1>
        </div>
        <p className="last-updated">Last updated: November 5, 2025</p>

        <section className="terms-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By using this anonymous confession platform (“the Service”), you agree to these Terms & Conditions.
            If you do not agree, please do not use the Service.
          </p>
        </section>

        <section className="terms-section">
          <h2>2. Anonymous Use</h2>
          <p>
            Our platform allows users to post confessions, replies, and reactions anonymously.
            No accounts or passwords are required. However, all users must follow these Terms and community guidelines
            when using the Service.
          </p>
        </section>

        <section className="terms-section">
          <h2>3. User Content & Responsibility</h2>
          <p>
            You are solely responsible for the confessions, replies, and reactions you submit.
            You agree not to post or share any content that:
          </p>
          <ul>
            <li>Contains hate speech, harassment, or threats.</li>
            <li>Includes personal, private, or identifying information about others.</li>
            <li>Promotes illegal activities or explicit adult content.</li>
            <li>Violates local laws or the rights of others.</li>
          </ul>
          <p>
            We reserve the right to remove any content that violates these terms or harms the platform or its users.
          </p>
        </section>

        <section className="terms-section">
          <h2>4. Moderation & Reporting</h2>
          <p>
            Users can report confessions or replies that violate these Terms or our community guidelines.
            Reported content may be reviewed and, if necessary, removed by moderators or staff.
          </p>
        </section>

        <section className="terms-section">
          <h2>5. IP-Based Ban System</h2>
          <p>
            To keep the platform safe, our system uses IP checks to detect and prevent abusive behavior.
            Your IP address is checked whenever you visit, post, or reply to ensure no active bans apply.
            IP information is used strictly for moderation and not for personal identification.
          </p>
          <p>
            For more details on how we handle IP information and privacy, please review our{' '}
            <Link to="/privacy-policy" className="policy-link">Privacy Policy</Link>.
          </p>
        </section>

        <section className="terms-section">
          <h2>6. Content Removal & Bans</h2>
          <p>
            We may remove confessions, replies, or reactions and issue temporary or permanent bans
            if a user violates these Terms. Bans are enforced through our IP-based moderation system.
          </p>
        </section>

        <section className="terms-section">
          <h2>7. No Personal Data or Accounts</h2>
          <p>
            This platform does not collect personal account information such as emails, usernames, or passwords.
            All participation is anonymous. Please avoid posting any personal or sensitive information in your messages.
          </p>
        </section>

        <section className="terms-section">
          <h2>8. Limitation of Liability</h2>
          <p>
            The Service is provided “as is” without warranties of any kind. We are not responsible for user-generated
            content or any harm, damage, or loss that results from using the Service.
          </p>
        </section>

        <section className="terms-section">
          <h2>9. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Any updates will be posted on this page with a new “Last updated” date.
            Continued use of the Service means you accept the revised Terms.
          </p>
        </section>

        <section className="contact-section">
          <h2>10. Contact Us</h2>
          <p>
            If you have questions or concerns about these Terms, please contact us at:
          </p>
          <p>Email: support@confessly.app</p>
        </section>
      </div>
    </div>
  );
};

export default TermsAndConditions;
