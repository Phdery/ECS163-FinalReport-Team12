# Data‑Science Job Salaries — Interactive Visualization Dashboard

## Description

This repository contains **Team 12’s final project for UC Davis ECS 163 (Human‑Computer Interaction)**.
Our goal is to help job‑seekers quickly answer three common questions about the 2024 tech job market:

1. **Where** in the United States are data‑science salaries the highest?
2. **What** skills and career tracks lead to better pay within each state?
3. **How** do company size and work‑mode (remote vs. on‑site) influence earnings?

We ingest and clean the **Kaggle “Data‑Science Job Salaries 2024”** dataset, convert every salary to USD, normalise location codes to USPS state abbreviations, and remove statistical outliers.
Two lightweight JSON files are produced:

* `state‑summary.json` — sample count plus highest, median and lowest salary for each state (powering the choropleth map).
* `detailed‑records.json` — row‑level data (`state / track / dominant skill / company size / salary`) for instant client‑side filtering.

The front‑end is a **plain HTML/CSS/JavaScript site**.  All interactivity is written in vanilla *ES6* and **D3.js v7**; there is **no build step, framework, or Node.js dependency**.

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
