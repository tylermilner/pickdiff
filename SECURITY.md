# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of PickDiff seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to the project maintainer. You can find contact information on the [GitHub profile](https://github.com/tylermilner) of the repository owner.

Include the following information in your report:

- **Type of vulnerability** (e.g., SQL injection, XSS, unauthorized access)
- **Full paths of source file(s)** related to the vulnerability
- **Location of the affected source code** (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the vulnerability** and how an attacker might exploit it

### What to Expect

- You should receive an acknowledgment of your report within **48 hours**
- We will investigate the issue and provide an estimated timeline for a fix
- We will keep you informed of our progress
- Once the vulnerability is fixed, we will publicly disclose it (with credit to you, if desired)

### Disclosure Policy

- We ask that you give us a reasonable amount of time to fix the vulnerability before public disclosure
- We will work with you to understand and resolve the issue promptly
- We appreciate your efforts to responsibly disclose your findings

## Security Best Practices

When using PickDiff, please follow these security best practices:

1. **Keep dependencies up to date**: Run `npm audit` regularly and update dependencies
2. **Use in trusted repositories**: Only run PickDiff on repositories you trust
3. **Review commits carefully**: When analyzing diffs, be aware of the commit sources
4. **Limit network exposure**: The server binds to localhost by default - keep it that way for security

## Security Updates

Security updates will be released as patches and documented in:
- GitHub Security Advisories
- The [CHANGELOG.md](CHANGELOG.md)
- Release notes

Subscribe to repository releases to stay informed of security updates.

## Acknowledgments

We appreciate the security research community and will acknowledge security researchers who responsibly disclose vulnerabilities to us (with their permission).

Thank you for helping keep PickDiff and its users safe!
