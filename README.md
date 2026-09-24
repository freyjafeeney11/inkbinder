# Inkbinder

Inkbinder is a desktop application tailored specifically for writing novels. It provides a focused environment for authors to draft, manage, and organize their literary projects locally.
<img width="1175" height="754" alt="Screenshot 2026-09-24 at 23 35 57" src="https://github.com/user-attachments/assets/4799eeeb-b749-4a4f-b592-d6e38aff113e" />
<img width="1180" height="757" alt="Screenshot 2026-09-24 at 23 34 13" src="https://github.com/user-attachments/assets/a83d0078-84ad-48e4-9eab-fe65f1678a17" />
<img width="1173" height="755" alt="Screenshot 2026-09-24 at 23 35 42" src="https://github.com/user-attachments/assets/dd895499-eaea-4c61-9c80-d278627843ba" />
## Tech Stack

Inkbinder is built using:

* **Frontend UI:** React with TypeScript.


* **Build Tool:** Vite.


* **Styling:** Tailwind CSS.


* **Desktop Framework:** Tauri (Rust).


* **Package Manager:** npm.


## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

* [Node.js](https://nodejs.org/?utm_source=gemini) (v16 or higher)
* [Rust](https://www.rust-lang.org/tools/install?utm_source=gemini)
* Tauri prerequisites for your specific OS (C++ build tools on Windows, Xcode on macOS, or WebKit dependencies on Linux).

### Installation

1. Clone the repository:
```bash
git clone https://github.com/freyjafeeney11/inkbinder.git
cd inkbinder

```


2. Install the frontend dependencies:
```bash
npm install

```


### Building for Production

To compile the application into a standalone, installable executable for your operating system (.app for macOS, .exe/.msi for Windows, or .AppImage/.deb for Linux), run:

```bash
npm run tauri build

```
The compiled binaries will be generated inside the `src-tauri/target/release/bundle/` directory.
