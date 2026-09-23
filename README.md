# 📚 Study Haven

> **A modern, secure, and organized digital study-material portal.**

Study Haven is a clean and responsive study platform designed to make academic resources easy to **organize, manage, search, and access**.

The platform provides an open **Viewer Mode** for students and a protected **Author Mode** for managing study content.

## ✨ Features

### 👁 Viewer Mode

* No account or signup required
* Browse available subjects
* Read study notes
* Open PDFs
* View study images
* Access useful external links
* Search across available study material
* Fully responsive on desktop and mobile

### 🔐 Author Mode

A secure dashboard for managing the entire study portal.

* Add, edit, and delete subjects
* Add subject cover images and descriptions
* Create and manage notes
* Upload PDFs
* Upload study images
* Add and manage useful links
* Organize resources inside subjects
* View basic content statistics

### 📖 Subject Organization

Each subject has its own dedicated space with organized sections:

* 📝 Notes
* 📄 PDFs
* 🖼️ Images
* 🔗 Useful Links

This keeps study material structured and easy to find.

### 🔎 Global Search

Search through:

* Subjects
* Notes
* PDFs
* Links

Search results are connected to their relevant subjects for easier navigation.

## 🛡️ Security

Study Haven separates public viewing from content management.

**Viewer Mode**

* Read-only access
* Cannot add content
* Cannot edit content
* Cannot delete content
* Cannot upload files
* Cannot access the Author Dashboard

**Author Mode**

* Protected by an Author password
* Sensitive credentials are intended to be stored through environment variables/secrets
* Content-management operations are restricted to authorized users

> Security should be enforced at the backend level rather than relying only on hidden frontend buttons.

## 🎨 Design

Study Haven focuses on a modern learning experience instead of a traditional basic school website.

* Modern dark interface
* Clean typography
* Responsive layout
* Subject cards
* Rounded UI components
* Professional navigation
* Subtle animations
* Clean icons
* Loading, empty, and error states
* Desktop and mobile support

## 🧰 Tech Stack

* **React**
* **TypeScript**
* **Vite**
* **Tailwind CSS**
* **shadcn/ui**
* **Supabase**
* **Lovable**
* **Bun / npm**

## 🏗️ Architecture

```text
Study Haven
│
├── Public Viewer
│   ├── Subjects
│   ├── Notes
│   ├── PDFs
│   ├── Images
│   └── Useful Links
│
├── Global Search
│
└── Author Dashboard
    ├── Subject Management
    ├── Notes Management
    ├── PDF Management
    ├── Image Management
    └── Link Management
```

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Dawood-Ahmad-07/Study-Haven.git
```

### 2. Navigate to the project

```bash
cd Study-Haven
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the development server

```bash
npm run dev
```

The application will then be available on the local development server.

## 🌐 Live Demo

**Study Haven:**
https://learn-garden-master.lovable.app

## 🎯 Project Goal

The goal of Study Haven is simple:

> **Create one organized place where students can easily access their study material, while keeping content management restricted to the authorized author.**

The project intentionally focuses on the core study-library experience rather than adding unnecessary features such as chatbots, planners, social features, or other productivity tools.

## 💰 Free-First Approach

Study Haven was designed with a **free-first architecture** in mind.

The project aims to minimize unnecessary costs by preferring:

* Free development tools
* Free hosting options
* Free database solutions
* Free/low-cost file storage
* No mandatory user accounts
* No paid APIs where they are unnecessary

The storage layer can also be replaced later if the project's requirements grow.

## 🛣️ Future Improvements

Possible future improvements include:

* 📌 Better resource categorization
* 🔍 Advanced search and filtering
* 📱 Further mobile optimization
* 📊 More detailed author analytics
* 🗂️ Improved file organization
* ⭐ Bookmark/favorite resources
* ⚡ Performance improvements

## 👨‍💻 Author

**Dawood Ahmad**

BSIT Student & Developer

* GitHub: [@Dawood-Ahmad-07](https://github.com/Dawood-Ahmad-07)

---

### ⭐ If you find Study Haven useful, consider giving the repository a star!

**Built with ❤️ for a better study experience.**
