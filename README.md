# Study Haven

Build a professional, modern and fully responsive Study Portal for me.

The app should be a clean digital study-material library where normal visitors can only view content, while I can manage all content through a secure Author mode.

1. Entry Screen

When the website opens, show a beautiful minimal welcome screen with two options:

👁 Only View
🔐 Author

Only View

No login or signup required.

User enters the main app directly.

User can only view/read content.

User cannot add, edit or delete anything.

Author

Ask for an Author password.

I will set the password myself through secure environment/secrets.

Never expose or hard-code the password in frontend code.

Only the correct password can open Author Dashboard.

Do not create Google login or normal user accounts. The public viewing experience must remain completely open.

2. Author Dashboard

After successful Author access, show a professional dashboard where I can manage the entire portal.

I should be able to:

Add unlimited subjects

Edit subjects

Delete subjects

Add subject name

Add subject cover picture

Add subject description

Add notes

Edit/delete notes

Upload PDFs

Upload study images

Add useful external links

Edit/delete links

Organize content inside subjects

Also show simple statistics:

Total Subjects

Total Notes

Total PDFs

Total Images

Total Links

3. Subjects

Display subjects as beautiful cards with:

Cover image

Subject name

Short description

Number of available materials

Clicking a subject opens its dedicated page.

Each subject should have clear sections for:

Notes | PDFs | Images | Useful Links

Make everything easy to browse.

4. Notes

Each note should support:

Title

Content

Optional topic/category

Created/updated date

Notes should be displayed in a clean, highly readable format.

5. PDFs & Images

I should be able to upload PDFs and images from Author mode.

Store the actual files using a suitable free storage solution, preferably Google Drive, while keeping file information/metadata organized separately.

Users should be able to view/open the available PDFs and images from the portal.

Do not require users to have Google accounts just to view the content.

6. Search

Add a global search bar so visitors can search:

Subjects

Notes

PDFs

Links

Search results should clearly show the related subject.

7. Design

The website must look like a professional modern study platform, not a basic school website.

Use:

Clean modern layout

Premium typography

Professional sidebar/navigation

Beautiful subject cards

Rounded components

Proper spacing

Subtle animations

Responsive desktop/mobile design

Dark modern theme with tasteful accent colors

Clean icons

Good empty/loading/error states

Keep the interface simple and fast.

8. Security & Permissions

The most important rule:

Only Author mode can modify content.

Normal visitors must never be able to:

Add content

Edit content

Delete content

Upload files

Access the Author dashboard

Do not simply hide buttons. Protect Author operations properly on the backend as well.

Keep the project secure and use environment variables/secrets for sensitive credentials.

9. Free-First Architecture

Keep the entire project as close to $0 cost as realistically possible.

Prefer:

Lovable for development

Free hosting/deployment option

Free database

Google Drive/free storage for PDFs and images

No paid APIs

No unnecessary paid services

No mandatory user accounts

Do not claim unlimited/lifetime free storage; design the storage layer so it can be replaced later if needed.

10. Important

Do not add AI, chatbot, planner, productivity tools, voice features, social features, ads, or unnecessary features.

The purpose of this version is simply:

A beautiful, professional and easy-to-use study material portal where anyone can view content and only the authorized Author can manage it.

Make all major features actually functional, not just visual placeholders.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://learn-garden-master.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/07b3aa76-5462-48dd-aaf1-c48cb1996694).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
