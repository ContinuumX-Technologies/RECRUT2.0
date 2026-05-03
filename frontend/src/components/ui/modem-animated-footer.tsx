import React from "react";
import {
  NotepadTextDashed,
} from "lucide-react";
import "./modem-animated-footer.css";

interface FooterLink {
  label: string;
  href: string;
}

interface SocialLink {
  icon: React.ReactNode;
  href: string;
  label: string;
}

interface FooterProps {
  brandName?: string;
  brandDescription?: string;
  socialLinks?: SocialLink[];
  navLinks?: FooterLink[];
  creatorName?: string;
  creatorUrl?: string;
  brandIcon?: React.ReactNode;
  className?: string;
}

export const Footer = ({
  brandName = "YourBrand",
  brandDescription = "Your description here",
  socialLinks = [],
  navLinks = [],
  creatorName,
  creatorUrl,
  brandIcon,
  className,
}: FooterProps) => {
  return (
    <section className={`footer-section ${className || ''}`}>
      <footer className="footer-element">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-content-inner">
              <div className="footer-brand-section">
                <div className="footer-brand-title">
                  <span className="footer-brand-name">
                    {brandName}
                  </span>
                </div>
                <p className="footer-brand-description">
                  {brandDescription}
                </p>
              </div>

              {socialLinks.length > 0 && (
                <div className="footer-social-links">
                  {socialLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.href}
                      className="footer-social-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="footer-social-icon">
                        {link.icon}
                      </div>
                      <span className="sr-only">{link.label}</span>
                    </a>
                  ))}
                </div>
              )}

              {navLinks.length > 0 && (
                <div className="footer-nav-links">
                  {navLinks.map((link, index) => (
                    <a
                      key={index}
                      className="footer-nav-link"
                      href={link.href}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copyright">
              ©{new Date().getFullYear()} {brandName}. All rights reserved.
            </p>
            {creatorName && creatorUrl && (
              <nav className="footer-creator">
                <a
                  href={creatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-creator-link"
                >
                  Crafted by {creatorName}
                </a>
              </nav>
            )}
          </div>
        </div>

        {/* Large background text - FIXED */}
        <div className="footer-background-text">
          {brandName.toUpperCase()}
        </div>

        {/* Bottom logo */}
        <div className="footer-logo-wrapper">
          <div className="footer-logo-box">
            {brandIcon || (
              <NotepadTextDashed className="footer-logo-icon footer-logo-icon-small" />
            )}
          </div>
        </div>

        {/* Bottom line */}
        <div className="footer-divider-line"></div>

        {/* Bottom shadow */}
        <div className="footer-shadow"></div>
      </footer>
    </section>
  );
};
