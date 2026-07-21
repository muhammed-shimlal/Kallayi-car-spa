# CONTRIBUTING.md

# 🤝 Contributing to Kallayi Car Spa

First of all, thank you for your interest in contributing to **Kallayi Car Spa**! Every contribution—whether it's fixing a bug, improving documentation, or adding a new feature—is greatly appreciated.

---

# Table of Contents

- Code of Conduct
- Ways to Contribute
- Development Setup
- Branching Strategy
- Commit Messages
- Pull Requests
- Coding Standards
- Reporting Bugs
- Suggesting Features
- Questions

---

# Code of Conduct

Please read the project's **CODE_OF_CONDUCT.md** before contributing.

By participating in this project, you agree to follow its guidelines.

---

# Ways to Contribute

You can contribute by:

- Fixing bugs
- Adding new features
- Improving documentation
- Optimizing performance
- Writing tests
- Improving API documentation
- Refactoring existing code
- Reviewing pull requests

---

# Development Setup

## 1. Fork the Repository

Click the **Fork** button on GitHub.

---

## 2. Clone Your Fork

```bash
git clone https://github.com/<your-username>/Kallayi-car-spa.git
```

Move into the project directory.

```bash
cd Kallayi-car-spa
```

---

## 3. Create a Virtual Environment

Windows

```powershell
python -m venv venv

venv\Scripts\activate
```

Linux/macOS

```bash
python3 -m venv venv

source venv/bin/activate
```

---

## 4. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 5. Run Database Migrations

```bash
python manage.py migrate
```

---

## 6. Start the Development Server

```bash
python manage.py runserver
```

---

# Branching Strategy

Always create a new branch before making changes.

Example:

```bash
git checkout -b feature/customer-search
```

Example branch names:

```
feature/new-module

feature/api-improvements

bugfix/login-error

hotfix/security-patch

docs/readme-update

refactor/service-module
```

---

# Commit Messages

Write clear and descriptive commit messages.

Examples:

```text
Add customer search endpoint

Fix JWT authentication issue

Improve booking validation

Update API documentation

Refactor finance module
```

Avoid vague messages like:

```text
Update

Fix

Changes

Test
```

---

# Pull Request Guidelines

Before submitting a pull request:

- Ensure the project builds successfully.
- Run the test suite.
- Update documentation if needed.
- Keep pull requests focused on a single change.
- Resolve merge conflicts before requesting review.

Include in your pull request:

- Description of the change
- Reason for the change
- Screenshots (if applicable)
- Related issue number (if applicable)

---

# Coding Standards

Follow these general guidelines:

- Follow PEP 8 for Python code.
- Use meaningful variable and function names.
- Keep functions focused on a single responsibility.
- Add comments only where they improve clarity.
- Remove unused imports and code.
- Maintain consistent formatting.

---

# API Development Guidelines

When adding new endpoints:

- Follow RESTful conventions.
- Validate all inputs.
- Return appropriate HTTP status codes.
- Protect endpoints with proper permissions when required.
- Update `API.md` with any new endpoints.

---

# Testing

Before submitting code, run:

```bash
python manage.py test
```

Ensure:

- Existing tests pass.
- New functionality is tested where appropriate.
- No unexpected errors are introduced.

---

# Reporting Bugs

When reporting a bug, include:

- Project version
- Operating system
- Python version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Error messages or stack traces (if available)

---

# Suggesting Features

Feature requests should include:

- A clear description of the feature.
- The problem it solves.
- A proposed implementation (optional).
- Any relevant examples or use cases.

---

# Documentation

If you add or change functionality, update the relevant documentation files where applicable, such as:

- `README.md`
- `API.md`
- `FEATURES.md`
- `DATABASE.md`
- `INSTALLATION.md`

---

# Questions

If you have questions about the project, please open a GitHub Discussion or Issue (if enabled) or contact the maintainer through GitHub.

---

# Recognition

All contributions—big or small—are appreciated. Thank you for helping improve Kallayi Car Spa.

---

# Maintainer

**Muhammed Shimlal**

GitHub:

https://github.com/muhammed-shimlal/Kallayi-car-spa

---

# License

By contributing to this project, you agree that your contributions will be licensed under the project's MIT License.