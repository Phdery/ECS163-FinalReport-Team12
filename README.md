# Data‑Science Job Salaries — Interactive Visualization Dashboard

## Description

SalaryScope is an interactive salary‑exploration dashboard built for UC Davis ECS 163, Team 12. It transforms the 2024 Kaggle Data‑Science Job Salaries dataset into a concise narrative that answers three common questions: Where in the United States pays the most, what roles and skills command that pay, and how company size shapes the outcome.

A lightweight preprocessing script converts every salary to U.S. dollars, maps employee residences to two‑letter state codes, removes extreme outliers, and writes two compact JSON files (state summary and row‑level detail) that together stay under 100 KB.

The browser then loads once and does the rest. Using vanilla ES6 and D3 v7, the page keeps five linked views in sync: a choropleth map, sunburst, treemap, Sankey diagram, and radar chart. Each click on one view instantly filters the others, guiding readers from national overview to personal skill gaps in a single flow.

Because everything is static HTML/CSS/JS, any simple HTTP server—VS Code Live Server, python -m http.server, or GitHub Pages—can host it; no build step or backend is required.

---

## Installation

No global installation is required.  Clone the repository anywhere on your machine:

```bash
$ git clone https://github.com/Phdery/ECS163-FinalReport-Team12.git
$ cd ECS163-FinalReport-Team12
```

---

## Execution

Because D3 fetches JSON files via `fetch`, you need to serve the files over *HTTP* (the browser will block `file://` requests).  Choose **either** of the following:

### 1 — VS Code “Live Server” (one click)

If you use VS Code, install the *Live Server* extension, open the project folder, right‑click `index.html` and choose **“Open with Live Server”**.

### 2 — Python http.server (built‑in)

```bash
# One‑liner in the project root
$ python3 -m http.server 8080

# Now visit http://localhost:8080 in your browser
```

The landing page will show a colour‑coded U.S. map.  Click on any state to see histograms and scatterplots specific to that region.

Please open an issue or pull request if you spot bugs or have suggestions!
