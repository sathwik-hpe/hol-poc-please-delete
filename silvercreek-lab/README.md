# HPE SilverCreek Hands-On Lab

This folder contains interactive hands-on labs for HPE SilverCreek platform with embedded browsers for real-time practice.

## Prerequisites

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Python 3 installed on your system (comes pre-installed on macOS)

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd hol
```

### 2. Start the Local Web Server

Run the following command to start a local web server:

```bash
python3 -m http.server 8000
```

Alternatively, if you have Python 2:

```bash
python -m SimpleHTTPServer 8000
```

### 3. Open the Lab in Your Browser

Once the server is running, open your web browser and navigate to:

```
http://localhost:8000
```

You should see the interactive lab interface with embedded browsers for hands-on practice.

## Available Labs

1. **Getting Started Lab** (`getting-started-lab.md`)
   - Duration: 30 minutes
   - Generate support bundles and create backups
   - Beginner friendly

2. **Interactive Browser Lab** (`index.html`)
   - Browser-based exercises with embedded interfaces
   - Real-time practice environment
   - Step-by-step guided exercises

## Lab Structure

- `index.html` - Main interactive lab page with initial exercises
- `success.html` - Follow-up page after completing initial exercises
- `styles.css` - Styling for the interactive lab pages
- `*.md` - Markdown-based lab guides

## Stopping the Server

To stop the web server, press `Ctrl+C` in the terminal where the server is running.

## Troubleshooting

- **Port already in use**: If port 8000 is already in use, try a different port:
  ```bash
  python3 -m http.server 8080
  ```
  Then navigate to `http://localhost:8080`

- **Permission issues**: Make sure you have read permissions for all files in the repository

- **CORS issues with embedded browsers**: Some external sites may not allow embedding due to CORS policies. This is expected behavior for security reasons.

## Support

For questions or issues, contact your HPE support team or open an issue in the repository.
