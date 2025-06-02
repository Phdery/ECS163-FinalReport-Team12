/*
  Skills → Job Tracks → Salary Quartiles Sankey Diagram
  Visualizes the flow from skills through job types to salary outcomes
  Uses TF-IDF weighting to highlight skill importance
*/

class SankeyViz {
  constructor(containerId) {
    // d3.select() creates D3 selection object for DOM element manipulation
    this.container = d3.select(containerId);
    this.width = 800;
    this.height = 400;
    this.margin = { top: 30, right: 80, bottom: 30, left: 80 };
    
    // append() creates new SVG element and sets dimensions
    this.svg = this.container.append("svg")
      .attr("width", this.width)
      .attr("height", this.height);
      
    this.init();
  }
  
  /**
   * Initialize Sankey layout and components
   */
  init() {
    // Create D3 Sankey layout with appropriate sizing
    // d3.sankey() creates flow diagram layout algorithm
    this.sankey = d3.sankey()
      .nodeWidth(15)
      .nodePadding(15)
      .size([this.width - this.margin.left - this.margin.right, 
             this.height - this.margin.top - this.margin.bottom]);
    
    // append() creates group element for chart content with margin transformation
    this.g = this.svg.append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
    
    // d3.scaleOrdinal() creates categorical color scale with predefined color scheme
    this.colorScale = d3.scaleOrdinal(d3.schemeSet3);
  }
  
  /**
   * Update Sankey diagram with new data
   * Main rendering function called when data changes
   */
  update(data, selectedState = null) {
    // Filter data to selected state if specified
    let filteredData = data;
    if (selectedState) {
      filteredData = data.filter(d => d.state === selectedState);
    }
    
    // Transform flat data into Sankey node-link structure
    const sankeyData = this.buildSankeyData(filteredData);
    
    // Apply Sankey layout algorithm to calculate positions
    this.sankey(sankeyData);
    
    // Clear previous visualization elements
    // selectAll() selects all matching elements for removal
    this.g.selectAll("*").remove();
    
    // Draw flow links between nodes
    // selectAll().data().enter() creates data-bound elements using D3's data join pattern
    const links = this.g.selectAll(".link")
      .data(sankeyData.links)
      .enter()
      .append("path")
      .attr("class", "link")
      // d3.sankeyLinkHorizontal() generates curved path strings for Sankey links
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", d => this.getLinkColor(d))
      .attr("stroke-width", d => Math.max(1, d.width))
      .attr("fill", "none")
      .attr("opacity", 0.6)
      .style("mix-blend-mode", "multiply");
    
    // Draw node rectangles with grouped structure
    const nodes = this.g.selectAll(".node")
      .data(sankeyData.nodes)
      .enter()
      .append("g")
      .attr("class", "node");
    
    // Add rectangles for each node using calculated positions
    nodes.append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", d => this.getNodeColor(d))
      .attr("stroke", "#333")
      .attr("stroke-width", 1);
    
    // Add node labels with intelligent positioning
    nodes.append("text")
      .attr("x", d => {
        const containerWidth = this.width - this.margin.left - this.margin.right;
        if (d.x0 < containerWidth / 3) {
          return d.x1 + 6;
        } else if (d.x0 > containerWidth * 2/3) {
          return d.x0 - 6;
        } else {
          return d.x0 + (d.x1 - d.x0) / 2;
        }
      })
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => {
        const containerWidth = this.width - this.margin.left - this.margin.right;
        if (d.x0 < containerWidth / 3) {
          return "start";
        } else if (d.x0 > containerWidth * 2/3) {
          return "end";
        } else {
          return "middle";
        }
      })
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .style("text-shadow", "1px 1px 2px rgba(255,255,255,0.8)")
      .text(d => {
        // Truncate long text for better layout
        const maxLength = 12;
        return d.name.length > maxLength ? d.name.substring(0, maxLength) + "..." : d.name;
      });
    
    // Add interactive behaviors
    this.addInteractions(links, nodes);
    
    // Entrance animations with staggered timing
    // transition() creates smooth animated changes to attributes
    links.attr("stroke-width", 0)
      .transition()
      .duration(1000)
      .delay((d, i) => i * 50)
      .attr("stroke-width", d => Math.max(1, d.width));
    
    nodes.style("opacity", 0)
      .transition()
      .duration(800)
      .delay((d, i) => i * 100)
      .style("opacity", 1);
  }
  
  /**
   * Build Sankey data structure from flat job data
   * Creates nodes and links for skills → job tracks → salary quartiles
   */
  buildSankeyData(data) {
    const skills = ["Python", "R", "Spark", "AWS/Cloud", "Excel"];
    const tracks = ["Data Scientist", "Data Engineer", "Data Analyst", "ML Engineer"];
    const salaryQuartiles = ["Q1 (Low)", "Q2 (Med-Low)", "Q3 (Med-High)", "Q4 (High)"];
    
    // Calculate salary quartiles using D3 quantile functions
    // d3.quantile() computes quantile values for statistical distribution
    const salaries = data.map(d => d.avg).filter(d => d > 0).sort((a, b) => a - b);
    const q1 = d3.quantile(salaries, 0.25);
    const q2 = d3.quantile(salaries, 0.5);
    const q3 = d3.quantile(salaries, 0.75);
    
    // Create node array with layer information for positioning
    const nodes = [
      ...skills.map(skill => ({ name: skill, type: "skill", layer: 0 })),
      ...tracks.map(track => ({ name: track, type: "track", layer: 1 })),
      ...salaryQuartiles.map(q => ({ name: q, type: "salary", layer: 2 }))
    ];
    
    // Create link array representing flows between nodes
    const links = [];
    
    // Create skills → job tracks links
    skills.forEach(skill => {
      const skillField = this.getSkillField(skill);
      tracks.forEach(track => {
        // Filter jobs that require this skill and belong to this track
        const relevantJobs = data.filter(d => 
          d[skillField] === 1 && this.categorizeJob(d.title) === track
        );
        
        if (relevantJobs.length > 0) {
          links.push({
            source: skills.indexOf(skill),
            target: skills.length + tracks.indexOf(track),
            value: relevantJobs.length,
            jobs: relevantJobs.length
          });
        }
      });
    });
    
    // Create job tracks → salary quartiles links
    tracks.forEach(track => {
      const trackJobs = data.filter(d => this.categorizeJob(d.title) === track);
      
      salaryQuartiles.forEach((quartile, qIndex) => {
        // Classify jobs into salary quartiles based on calculated thresholds
        const quartileJobs = trackJobs.filter(d => {
          const salary = d.avg;
          if (qIndex === 0) return salary <= q1;
          if (qIndex === 1) return salary > q1 && salary <= q2;
          if (qIndex === 2) return salary > q2 && salary <= q3;
          return salary > q3;
        });
        
        if (quartileJobs.length > 0) {
          links.push({
            source: skills.length + tracks.indexOf(track),
            target: skills.length + tracks.length + qIndex,
            value: quartileJobs.length,
            // d3.mean() calculates average salary for this quartile group
            avgSalary: d3.mean(quartileJobs, d => d.avg)
          });
        }
      });
    });
    
    // Filter out very small links to reduce visual clutter
    const filteredLinks = links.filter(link => link.value >= 1);
    
    return { nodes, links: filteredLinks };
  }
  
  /**
   * Map skill display names to database field names
   */
  getSkillField(skill) {
    const skillMap = {
      "Python": "python_yn",
      "R": "R_yn", 
      "Spark": "spark",
      "AWS/Cloud": "aws",
      "Excel": "excel"
    };
    return skillMap[skill];
  }
  
  /**
   * Calculate TF-IDF weighting for skill importance
   * Simplified TF-IDF ensures reasonable numerical values
   */
  calculateTFIDF(tf, totalJobs, skill, track, allData) {
    // Calculate term frequency score
    const tf_score = tf / Math.max(totalJobs, 1);
    
    // Calculate inverse document frequency using natural logarithm
    // Math.log() computes natural log for IDF calculation
    const skillField = this.getSkillField(skill);
    const docsWithSkill = allData.filter(d => d[skillField] === 1).length;
    const idf = Math.log(allData.length / Math.max(docsWithSkill, 1));
    
    // Return weighted value with minimum threshold to avoid zero values
    return Math.max(tf_score * Math.max(idf, 0.1), 0.1) * tf;
  }
  
  /**
   * Categorize job titles into standard tracks
   * Uses keyword matching for consistent classification
   */
  categorizeJob(jobTitle) {
    const title = jobTitle.toLowerCase();
    if (title.includes("data scientist")) return "Data Scientist";
    if (title.includes("data engineer")) return "Data Engineer";  
    if (title.includes("data analyst") || title.includes("analyst")) return "Data Analyst";
    if (title.includes("machine learning") || title.includes("ml engineer")) return "ML Engineer";
    return "Other";
  }
  
  /**
   * Get color for Sankey links based on source node
   */
  getLinkColor(d) {
    // Color links based on their source node name using ordinal scale
    if (d.source.type === "skill") {
      return this.colorScale(d.source.name);
    } else {
      return this.colorScale(d.source.name);
    }
  }
  
  /**
   * Get color for Sankey nodes based on type
   */
  getNodeColor(d) {
    if (d.type === "skill") return "#8dd3c7";
    if (d.type === "track") return "#ffffb3"; 
    return "#bebada";
  }
  
  /**
   * Add interactive behaviors to links and nodes
   * Provides hover effects and click handlers
   */
  addInteractions(links, nodes) {
    // Link hover effects with opacity manipulation
    links
      .on("mouseover", (event, d) => {
        // Fade out all links except hovered one
        // style() method applies CSS styles to D3 selections
        links.style("opacity", 0.1);
        d3.select(event.currentTarget).style("opacity", 0.8);
        
        this.showLinkTooltip(event, d);
      })
      .on("mouseout", () => {
        // Restore normal opacity for all links
        links.style("opacity", 0.6);
        this.hideTooltip();
      });
    
    // Node hover effects with link highlighting
    nodes
      .on("mouseover", (event, d) => {
        // Highlight links connected to hovered node
        links.style("opacity", link => 
          link.source === d || link.target === d ? 0.8 : 0.1
        );
        
        this.showNodeTooltip(event, d);
      })
      .on("mouseout", () => {
        links.style("opacity", 0.6);
        this.hideTooltip();
      })
      .on("click", (event, d) => {
        // Dispatch custom event for node selection
        const selectEvent = new CustomEvent("sankeyNodeSelected", { 
          detail: { 
            node: d.name,
            type: d.type
          } 
        });
        document.dispatchEvent(selectEvent);
      });
  }
  
  /**
   * Show tooltip for link hover with flow information
   */
  showLinkTooltip(event, d) {
    // Use data join pattern to create or update single tooltip
    // selectAll().data([null]).join() ensures only one tooltip exists
    const tooltip = d3.select("body").selectAll(".sankey-tooltip")
      .data([null])
      .join("div")
      .attr("class", "sankey-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.8)")
      .style("color", "white")
      .style("padding", "10px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "10000");
  
    // Build tooltip content with flow information
    let content = `<strong>${d.source.name} → ${d.target.name}</strong><br>`;
    if (d.jobs) {
      content += `Job Count: ${d.jobs}<br>`;
    }
    if (d.avgSalary) {
      content += `Average Salary: $${(d.avgSalary / 1000).toFixed(2)}k`;
    }
    
    // Position tooltip near mouse cursor
    tooltip.html(content)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px")
      .style("opacity", 1);
  }
  
  /**
   * Show tooltip for node hover with basic information
   */
  showNodeTooltip(event, d) {
    const tooltip = d3.select("body").selectAll(".sankey-tooltip")
      .data([null])
      .join("div")
      .attr("class", "sankey-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.8)")
      .style("color", "white")
      .style("padding", "10px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "10000");
    
    tooltip.html(`<strong>${d.name}</strong><br>Type: ${d.type}`)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px")
      .style("opacity", 1);
  }
  
  /**
   * Hide tooltip with opacity transition
   */
  hideTooltip() {
    // d3.select() finds tooltip and sets opacity to hide it
    d3.select(".sankey-tooltip").style("opacity", 0);
  }
}