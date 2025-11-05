import React from 'react';
import '../styles/PrivacyPolicy.css';

const PrivacyPolicy = () => {
  return (
    <div className="privacy-container">
      <div className="privacy-content">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last updated: November 5, 2025</p>

        <section className="privacy-section">
          <h2>1. Overview</h2>
          <p>
            Welcome to our anonymous confession platform. Your privacy and safety are our top priorities.
            This Privacy Policy explains what data we collect, how we use it, and how we protect your anonymity.
            By using our website, you agree to this policy.
          </p>
        </section>

        <section className="privacy-section">
          <h2>2. What We Collect</h2>
          <p>
            We do not require user accounts, usernames, or passwords. You can post, reply, or react anonymously.
            However, we collect limited technical data to keep the platform safe and functioning properly:
          </p>
          <ul>
            <li>
              <strong>Confession and reply content:</strong> The text you submit (confessions, replies, or reactions).
            </li>
            <li>
              <strong>IP address (for security):</strong> Used only for moderation, such as detecting spam, abuse, or enforcing bans.
            </li>
            <li>
              <strong>Basic usage data:</strong> Information about how you use the website, such as page views and interactions, for performance and abuse prevention.
            </li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>3. How We Use the Information</h2>
          <p>We use the limited data we collect to:</p>
          <ul>
            <li>Prevent spam, harassment, and rule violations through IP-based bans.</li>
            <li>Allow users to report inappropriate confessions or replies for moderation.</li>
            <li>Maintain and improve the platform’s performance and security.</li>
            <li>Analyze overall, anonymous usage trends (no personal tracking).</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>4. IP and Ban Policy</h2>
          <p>
            Each time you visit or interact (confess or reply), the system checks your IP address against a ban list.
            This helps prevent previously banned users from accessing or posting on the site.
            IP information is not publicly visible and is never shared, sold, or used to personally identify you.
          </p>
        </section>

        <section className="privacy-section">
          <h2>5. Reporting and Moderation</h2>
          <p>
            Users can report confessions or replies that violate community guidelines.
            Reported content may be reviewed by moderators and, if necessary, removed.
            We may use IP information to take moderation actions such as warnings or bans.
          </p>
        </section>

        <section className="privacy-section">
          <h2>6. Data Security</h2>
          <p>
            We take reasonable technical steps to protect all data stored on our platform.
            However, please remember that no internet system is completely secure.
            Avoid sharing personal or sensitive information in your confessions or replies.
          </p>
        </section>

        <section className="privacy-section">
          <h2>7. Third-Party Services</h2>
          <p>
            Our app may use trusted third-party services (such as analytics or hosting) to improve performance and
            reliability. These services may collect basic, non-identifiable technical data as part of their operations.
            They have their own privacy policies governing how they handle data.
          </p>
        </section>

        <section className="privacy-section">
          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Updates will be posted on this page, and the
            “Last Updated” date will be revised. Continued use of the site after updates means you accept the new terms.
          </p>
        </section>

        <section className="contact-section">
          <h2>9. Contact Us</h2>
          <p>
            If you have questions, concerns, or feedback about this Privacy Policy or how your data is handled,
            you can contact us at:
          </p>
          <p>Email: privacy@confessly.app</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
