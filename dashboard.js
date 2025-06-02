/*
  Main Dashboard Coordinator - Manages Cross-Component Interactions
  Orchestrates data flow between map, treemap, sankey, and radar chart components
  Handles state management, event coordination, and data filtering
*/

class Dashboard {
  constructor() {
    this.selectedState = null;
    this.selectedTrack = null;
    this.selectedCompanySize = null;
    this.data = null;
    
    this.init();
  }
  
  async init() {
    try {
      // Wait for map data loading completion before dashboard initialization
      await this.waitForMapData();
      
      // Store dashboard instance globally for cross-component access
      window.dashboard = this;
      
      // Initialize all visualization components with their container selectors
      this.treemap = new TreemapViz("#treemap");
      this.sankey = new SankeyViz("#sankey");
      this.radar = new RadarChart("#radar");
      
      // Set up event listeners for component coordination
      this.setupEventListeners();
      
      console.log("Dashboard initialized successfully");
      console.log("Dashboard data sample:", this.data.slice(0, 3));
    } catch (error) {
      console.error("Dashboard initialization failed:", error);
    }
  }
  
  /**
   * Wait for map component to finish loading and processing data
   * Uses Promise-based polling to check for data availability
   */
  waitForMapData() {
    return new Promise((resolve, reject) => {
      const checkData = () => {
        if (window.debugData && window.debugData.rows) {
          this.data = this.extractDataFromMap();
          console.log("Data extracted for dashboard:", this.data.length, "records");
          resolve();
        } else {
          setTimeout(checkData, 100);
        }
      };
      checkData();
      
      // Timeout handling to prevent infinite waiting
      setTimeout(() => reject(new Error("Map data loading timeout")), 10000);
    });
  }
  
  /**
   * Extract and transform raw CSV data for dashboard consumption
   * Standardizes data format and ensures consistent field naming across components
   */
  extractDataFromMap() {
    const allData = [];
    
    if (window.debugData && window.debugData.rows) {
      console.log("Raw data sample for debugging:", window.debugData.rows[0]);
      
      window.debugData.rows.forEach(job => {
        if (job.state && job.state.length === 2) {
          // Extract salary fields correctly from original CSV field names
          let avgSalary = 0;
          
          // Try multiple possible salary field names for data robustness
          if (job.avg_salary) {
            avgSalary = parseFloat(job.avg_salary) || 0;
          } else if (job.avg) {
            avgSalary = parseFloat(job.avg) || 0;
          } else if (job['Salary Estimate']) {
            // Extract numeric value from salary estimate string if present
            const salaryMatch = job['Salary Estimate'].match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
            avgSalary = salaryMatch ? parseFloat(salaryMatch[1].replace(/,/g, '')) : 0;
          }
          
          // Ensure salary values are within reasonable range (30k - 300k)
          if (avgSalary < 30000 || avgSalary > 300000) {
            // Convert if stored in thousands format
            avgSalary = avgSalary < 1000 ? avgSalary * 1000 : avgSalary;
          }
          
          const minSalary = job.min_salary ? parseFloat(job.min_salary) : avgSalary * 0.8;
          const maxSalary = job.max_salary ? parseFloat(job.max_salary) : avgSalary * 1.2;
          
          allData.push({
            state: job.state,
            title: job.title || job["Job Title"] || "",
            avg: avgSalary,
            min: minSalary,
            max: maxSalary,
            // Ensure skill fields are converted to numeric values for consistency
            python_yn: parseInt(job.python_yn) || 0,
            R_yn: parseInt(job.R_yn) || 0,
            spark: parseInt(job.spark) || 0,
            aws: parseInt(job.aws) || 0,
            excel: parseInt(job.excel) || 0,
            size: job.size || job.Size || this.generateRandomSize(),
            company: job.company || job["Company Name"] || "Unknown"
          });
        }
      });
    }
    
    console.log("Extracted data sample for verification:", allData.slice(0, 5));
    // d3.min(), d3.max(), and d3.mean() provide statistical summary of salary data
    console.log("Salary statistics:", {
      min: d3.min(allData, d => d.avg),
      max: d3.max(allData, d => d.avg),
      avg: d3.mean(allData, d => d.avg)
    });
    
    return allData;
  }
  
  /**
   * Set up event listeners for cross-component communication
   * Creates event-driven architecture for loose component coupling
   */
  setupEventListeners() {
    // Listen for state selection events from map component
    document.addEventListener("stateSelected", (e) => {
      this.handleStateSelection(e.detail.state);
    });
    
    // Listen for job track selection events from various components
    document.addEventListener("jobTrackSelected", (e) => {
      this.handleTrackSelection(e.detail.track);
    });
    
    // Listen for company size selection events from treemap component
    document.addEventListener("companySizeSelected", (e) => {
      this.handleCompanySizeSelection(e.detail.size);
    });
    
    // Listen for Sankey node selection events for drill-down functionality
    document.addEventListener("sankeyNodeSelected", (e) => {
      this.handleSankeyNodeSelection(e.detail.node, e.detail.type);
    });
  }
  
  /**
   * Handle state selection and update all dependent components
   * Filters data by state and refreshes visualizations accordingly
   */
  handleStateSelection(state) {
    this.selectedState = state;
    this.selectedTrack = null;
    this.selectedCompanySize = null;
    
    // Update breadcrumb navigation for user context
    this.updateBreadcrumb(`${state} → Select a job track`);
    
    // Filter data to selected state and update all relevant components
    const stateData = this.data.filter(d => d.state === state);
    
    if (stateData.length > 0) {
      this.treemap.update(stateData);
      this.sankey.update(stateData, state);
      this.radar.updateIndustryAverage(stateData);
    }
    
    console.log(`Selected state: ${state}, ${stateData.length} jobs found`);
  }
  
  /**
   * Handle job track selection and update components with filtered data
   * Further refines data filtering by combining state and job track filters
   */
  handleTrackSelection(track) {
    this.selectedTrack = track;
    this.updateBreadcrumb(`${this.selectedState} → ${track}`);
    
    // Apply both state and track filters for refined data subset
    const filteredData = this.data.filter(d => 
      d.state === this.selectedState && 
      this.categorizeJob(d.title) === track
    );
    
    this.treemap.update(filteredData, track);
    this.radar.updateIndustryAverage(filteredData, track);
  }
  
  /**
   * Handle company size selection for potential future filtering
   * Currently provides logging for development and debugging
   */
  handleCompanySizeSelection(size) {
    this.selectedCompanySize = size;
    console.log(`Selected company size: ${size}`);
  }
  
  /**
   * Handle Sankey node selection with type-specific behavior
   * Routes different node types to appropriate handlers
   */
  handleSankeyNodeSelection(node, type) {
    console.log(`Selected Sankey node: ${node} (${type})`);
    
    if (type === "track") {
      this.handleTrackSelection(node);
    }
  }
  
  /**
   * Categorize job titles into standard career tracks
   * Provides consistent job classification across all dashboard components
   */
  categorizeJob(jobTitle) {
    if (!jobTitle) return "Other";
    
    const title = jobTitle.toLowerCase();
    if (title.includes("data scientist")) return "Data Scientist";
    if (title.includes("data engineer")) return "Data Engineer";
    if (title.includes("data analyst") || title.includes("analyst")) return "Data Analyst";
    if (title.includes("machine learning") || title.includes("ml engineer")) return "ML Engineer";
    return "Other";
  }
  
  /**
   * Generate random company size for missing data entries
   * Provides fallback data to maintain visualization completeness
   */
  generateRandomSize() {
    const sizes = ["Small (1-200)", "Medium (201-1000)", "Large (1000+)"];
    return sizes[Math.floor(Math.random() * sizes.length)];
  }
  
  /**
   * Update breadcrumb navigation display
   * Provides user context showing current selection path
   */
  updateBreadcrumb(text) {
    const breadcrumb = document.getElementById("breadcrumb-text");
    if (breadcrumb) {
      breadcrumb.textContent = text;
    }
  }
}

// Initialize dashboard when DOM content is fully loaded
// Ensures all HTML elements are available before component initialization
document.addEventListener("DOMContentLoaded", () => {
  new Dashboard();
});