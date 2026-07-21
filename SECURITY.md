# SECURITY.md

# 🔒 Security Policy

## Kallayi Car Spa

Thank you for helping improve the security of **Kallayi Car Spa**. We appreciate responsible security research and encourage the responsible disclosure of security vulnerabilities.

---

# Supported Versions

The following table indicates which versions are currently supported with security updates.

| Version | Supported |
|----------|-----------|
| 1.x | ✅ Yes |
| < 1.0 | ❌ No |

---

# Reporting a Vulnerability

If you discover a security vulnerability, please **do not create a public GitHub issue**.

Instead, report it privately with the following information:

- Vulnerability description
- Steps to reproduce
- Impact assessment
- Proof of Concept (if available)
- Suggested mitigation (optional)

---

# Response Process

After receiving a valid security report, the maintainer will:

1. Acknowledge the report.
2. Verify the vulnerability.
3. Assess its severity.
4. Develop and test a fix.
5. Release a security update.
6. Credit the reporter (if requested).

---

# Target Response Times

| Action | Target Time |
|---------|-------------|
| Initial acknowledgement | Within 7 days |
| Status update | Within 14 days |
| Security fix (when feasible) | As soon as practical |

> These targets are goals and may vary depending on the complexity of the issue.

---

# Security Best Practices

Developers and contributors should:

- Keep Python and Django up to date.
- Regularly update project dependencies.
- Use strong, unique passwords.
- Never commit secrets or credentials.
- Validate all user input.
- Review code before merging changes.
- Keep third-party libraries updated.

---

# Authentication

The application is designed to use:

- JWT Authentication
- Password hashing via Django
- Permission-based access control
- Protected API endpoints

---

# Environment Variables

Sensitive information should be stored in environment variables or a `.env` file.

Examples include:

- `SECRET_KEY`
- Database credentials
- JWT signing keys
- API keys

Never commit these values to source control.

---

# Database Security

Recommended practices:

- Use PostgreSQL in production.
- Restrict database access to trusted hosts.
- Use strong database passwords.
- Back up the database regularly.
- Enable encrypted connections where possible.

---

# API Security

Recommendations:

- Require authentication for protected endpoints.
- Validate all request data.
- Return appropriate HTTP status codes.
- Avoid exposing internal error details.
- Use HTTPS in production.

---

# Deployment Security

Before deploying:

- Set `DEBUG=False`.
- Configure `ALLOWED_HOSTS`.
- Use HTTPS.
- Secure environment variables.
- Restrict server access.
- Keep the operating system updated.
- Apply database migrations.

---

# Dependency Management

Before each release:

```bash
pip install --upgrade -r requirements.txt
```

Review dependency changes before deploying them to production.

---

# Sensitive Data

Do not store or expose:

- Plain-text passwords
- API keys
- Secret keys
- Database credentials
- Authentication tokens
- Personal customer information beyond what is necessary for the application

---

# Responsible Disclosure

Please allow time for a fix before publicly disclosing a confirmed vulnerability. Coordinated disclosure helps protect users while a patch is being prepared.

---

# Security Recommendations for Contributors

- Follow secure coding practices.
- Keep pull requests focused and reviewable.
- Test authentication and authorization changes carefully.
- Avoid introducing unnecessary dependencies.
- Document security-relevant changes.

---

# Security Checklist

Before each production release:

- [ ] `DEBUG=False`
- [ ] `SECRET_KEY` stored securely
- [ ] `ALLOWED_HOSTS` configured
- [ ] HTTPS enabled
- [ ] Dependencies updated
- [ ] Database backed up
- [ ] Migrations applied
- [ ] Authentication tested
- [ ] Authorization verified
- [ ] Environment variables configured

---

# Third-Party Dependencies

This project may rely on open-source libraries such as:

- Python
- Django
- Django REST Framework
- SimpleJWT

Please monitor these dependencies for published security updates.

---

# Contact

For security-related concerns, please contact the project maintainer through GitHub.

Maintainer:

**Muhammed Shimlal**

GitHub:

https://github.com/muhammed-shimlal/Kallayi-car-spa

---

# Acknowledgements

Thank you to everyone who helps improve the security of Kallayi Car Spa through responsible reporting and secure development practices.

---

# License

This project is licensed under the MIT License.