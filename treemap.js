/*
  Company Size Salary Analysis - Treemap Visualization
  Shows salary distribution across different company sizes using rectangular tree layout
  Features hover effects, sparklines, and interactive selection for drill-down analysis
*/

class TreemapViz {
  constructor(containerId) {
    // d3.select() creates D3 selection object for DOM element manipulation
    this.container = d3.select(containerId);
    this.width = 400;
    this.height = 300;
    this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
    
    // Create SVG container with gradient background for modern appearance
    this.svg = this.container.append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .style("background", "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)")
      .style("border-radius", "8px");
      
    // Create sequential color scale for salary visualization
    // d3.scaleSequential() maps continuous values to interpolated colors
    // d3.interpolateRgb() creates smooth color transition between two colors
    this.colorScale = d3.scaleSequential()
      .interpolator(d3.interpolateRgb("#e8f4fd", "#1e88e5"));
    
    this.init();
  }
  
  /**
   * Initialize treemap layout and container group
   * Sets up the D3 treemap algorithm configuration
   */
  init() {
    // Create D3 treemap layout algorithm
    // d3.treemap() partitions rectangular area based on hierarchical data values
    this.treemap = d3.treemap()
      .size([this.width - this.margin.left - this.margin.right, 
             this.height - this.margin.top - this.margin.bottom])
      .padding(2)
      .round(true);
      
    // Create group element for chart content with margin transformation
    this.g = this.svg.append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
  }
  
  /**
   * Categorize company size from various text formats
   * Standardizes different size descriptions into consistent categories
   */
  categorizeCompanySize(size) {
    if (!size || size === "-1" || size === "Unknown") return "Unknown";
    
    const sizeStr = size.toLowerCase();
    if (sizeStr.includes("1 to 50") || sizeStr.includes("51 to 200")) {
      return "Small (1-200)";
    } else if (sizeStr.includes("201 to 500") || sizeStr.includes("501 to 1000")) {
      return "Medium (201-1000)";
    } else if (sizeStr.includes("1001 to 5000") || sizeStr.includes("5001 to 10000") || sizeStr.includes("10000+")) {
      return "Large (1000+)";
    }
    return "Unknown";
  }
  
  /**
   * Update treemap with new data and optional job track filter
   * Main rendering function called when data changes or filters are applied
   */
  update(data, selectedTrack = null) {
    // Filter data by job track if specified
    let filteredData = data;
    if (selectedTrack) {
      filteredData = data.filter(d => this.categorizeJob(d.title) === selectedTrack);
    }
    
    // Group jobs by company size category
    // d3.group() creates Map with company size as key and job arrays as values
    const sizeGroups = d3.group(filteredData, d => this.categorizeCompanySize(d.size));
    
    // Transform grouped data into hierarchical structure for treemap
    const hierarchyData = {
      name: "root",
      children: Array.from(sizeGroups, ([size, jobs]) => ({
        name: size,
        value: jobs.length,
        // d3.mean() calculates average salary across all jobs in this size category
        avgSalary: d3.mean(jobs, d => d.avg),
        // d3.min() and d3.max() find salary range bounds
        minSalary: d3.min(jobs, d => d.min),
        maxSalary: d3.max(jobs, d => d.max),
        jobs: jobs.length
      }))
    };
    
    // Update color scale domain based on current salary range
    const salaries = hierarchyData.children.map(d => d.avgSalary).filter(d => d);
    if (salaries.length > 0) {
      // d3.extent() returns [minimum, maximum] array for domain setting
      const [minSalary, maxSalary] = d3.extent(salaries);
      this.colorScale.domain([minSalary, maxSalary]);
    }
    
    // Create D3 hierarchy structure from nested data
    // d3.hierarchy() converts nested data to tree structure with parent-child relationships
    const root = d3.hierarchy(hierarchyData)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);
    
    // Apply treemap layout algorithm to calculate rectangle positions and sizes
    this.treemap(root);
    
    // Bind data to cell groups using key function for object constancy
    // Object constancy ensures smooth transitions when data updates
    const cells = this.g.selectAll(".cell")
      .data(root.leaves(), d => d.data.name);
    
    // Handle exit selection with fade-out animation
    cells.exit()
      .transition()
      .duration(500)
      .style("opacity", 0)
      .remove();
    
    // Create enter selection for new data elements
    const cellsEnter = cells.enter()
      .append("g")
      .attr("class", "cell")
      .style("opacity", 0);
    
    // Merge enter and update selections for unified data handling
    const cellsUpdate = cellsEnter.merge(cells);
    
    // Add visual elements to new cells
    cellsEnter.append("rect");
    cellsEnter.append("text").attr("class", "size-label");
    cellsEnter.append("text").attr("class", "salary-label");
    cellsEnter.append("g").attr("class", "sparkline");
    
    // Update rectangle properties with smooth transitions
    cellsUpdate.select("rect")
      .transition()
      .duration(800)
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", d => {
        if (!d.data.avgSalary || d.data.avgSalary === 0) {
          return "#f1f3f4";
        }
        return this.colorScale(d.data.avgSalary);
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 3)
      .attr("rx", 4)
      .attr("ry", 4)
      .style("filter", "drop-shadow(0 2px 8px rgba(0,0,0,0.1))");
    
    // Update size labels with intelligent color selection based on background
    cellsUpdate.select(".size-label")
      .transition()
      .duration(800)
      .attr("x", d => (d.x0 + d.x1) / 2)
      .attr("y", d => d.y0 + 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .attr("fill", d => {
        // d3.color() creates color object for lightness analysis
        // Automatically choose text color based on background brightness
        const bgColor = d3.color(this.colorScale(d.data.avgSalary || 0));
        return bgColor && bgColor.l < 0.5 ? "#ffffff" : "#2c3e50";
      })
      .style("text-shadow", d => {
        const bgColor = d3.color(this.colorScale(d.data.avgSalary || 0));
        return bgColor && bgColor.l < 0.5 ? "1px 1px 2px rgba(0,0,0,0.5)" : "1px 1px 2px rgba(255,255,255,0.8)";
      })
      .text(d => d.data.name);
    
    // Update salary labels with consistent formatting
    cellsUpdate.select(".salary-label")
      .transition()
      .duration(800)
      .attr("x", d => (d.x0 + d.x1) / 2)
      .attr("y", d => d.y0 + 38)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("fill", d => {
        const bgColor = d3.color(this.colorScale(d.data.avgSalary || 0));
        return bgColor && bgColor.l < 0.5 ? "#ffffff" : "#34495e";
      })
      .style("text-shadow", d => {
        const bgColor = d3.color(this.colorScale(d.data.avgSalary || 0));
        return bgColor && bgColor.l < 0.5 ? "1px 1px 2px rgba(0,0,0,0.5)" : "1px 1px 2px rgba(255,255,255,0.8)";
      })
      .text(d => {
        if (d.data.avgSalary && d.data.avgSalary > 0) {
          return `$${(d.data.avgSalary / 1000).toFixed(2)}k avg`;
        }
        return "$0.00k avg";
      });
    
    // Add job count labels for additional context
    cellsEnter.append("text").attr("class", "count-label");
    cellsUpdate.select(".count-label")
      .transition()
      .duration(800)
      .attr("x", d => (d.x0 + d.x1) / 2)
      .attr("y", d => d.y0 + 52)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("font-weight", "400")
      .attr("fill", d => {
        const bgColor = d3.color(this.colorScale(d.data.avgSalary || 0));
        return bgColor && bgColor.l < 0.5 ? "#e8eaf6" : "#546e7a";
      })
      .text(d => `${d.data.jobs} jobs`);
    
    // Add sparkline mini-charts showing salary distribution
    this.drawSparklines(cellsUpdate);
    
    // Entrance animation with staggered timing for visual appeal
    cellsEnter.transition()
      .duration(800)
      .delay((d, i) => i * 100)
      .style("opacity", 1);
    
    // Add interactive event handlers
    cellsUpdate
      .on("mouseover", this.handleMouseOver.bind(this))
      .on("mouseout", this.handleMouseOut.bind(this))
      .on("click", this.handleClick.bind(this));
  }
  
  /**
   * Draw sparkline mini-charts showing salary distribution within each cell
   * Creates small line charts displaying min-avg-max salary progression
   */
  drawSparklines(selection) {
    // Use D3's each() method to process each data-bound element individually
    selection.select(".sparkline").each(function(d) {
      // d3.select(this) selects current element in iteration
      const sparkline = d3.select(this);
      sparkline.selectAll("*").remove();
      
      const width = d.x1 - d.x0 - 10;
      const height = 8;
      const y = d.y1 - 15;
      
      // Skip sparklines for cells too small to display clearly
      if (width < 50) return;
      
      // Prepare data points for min, average, and max salaries
      const data = [d.data.minSalary, d.data.avgSalary, d.data.maxSalary];
      
      // Create linear scales for sparkline positioning
      // d3.scaleLinear() maps data domain to pixel range
      const xScale = d3.scaleLinear()
        .domain([0, 2])
        .range([d.x0 + 5, d.x1 - 5]);
      
      const yScale = d3.scaleLinear()
        .domain(d3.extent(data))
        .range([y + height, y]);
      
      // Create line generator for sparkline path
      // d3.line() generates SVG path string from data points
      const line = d3.line()
        .x((d, i) => xScale(i))
        .y(d => yScale(d))
        .curve(d3.curveMonotoneX);
      
      // Draw sparkline path using line generator
      sparkline.append("path")
        .datum(data)
        .attr("d", line)
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5)
        .attr("fill", "none");
      
      // Add data points as small circles
      sparkline.selectAll(".spark-dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "spark-dot")
        .attr("cx", (d, i) => xScale(i))
        .attr("cy", d => yScale(d))
        .attr("r", 1.5)
        .attr("fill", "#333");
    });
  }
  
  /**
   * Categorize job titles into standard career tracks
   * Provides consistent job classification across dashboard components
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
   * Handle mouse hover events with visual emphasis
   * Provides immediate feedback and shows detailed tooltip
   */
  handleMouseOver(event, d) {
    // Apply visual emphasis with D3 transitions
    // d3.select(event.currentTarget) selects the hovered element
    d3.select(event.currentTarget).select("rect")
      .transition()
      .duration(200)
      .attr("stroke-width", 4)
      .attr("stroke", "#1976d2")
      .style("filter", "drop-shadow(0 4px 12px rgba(25,118,210,0.3)) brightness(1.05)")
      .attr("transform", "scale(1.02)");
    
    this.showTooltip(event, d);
  }
  
  /**
   * Handle mouse leave events to restore normal appearance
   * Removes hover effects with smooth transitions
   */
  handleMouseOut(event, d) {
    // Restore original visual state
    d3.select(event.currentTarget).select("rect")
      .transition()
      .duration(200)
      .attr("stroke-width", 3)
      .attr("stroke", "#ffffff")
      .style("filter", "drop-shadow(0 2px 8px rgba(0,0,0,0.1))")
      .attr("transform", "scale(1)");
    
    this.hideTooltip();
  }
  
  /**
   * Handle click events for company size selection
   * Dispatches custom event for cross-component communication
   */
  handleClick(event, d) {
    // Create custom event for dashboard coordination
    const selectEvent = new CustomEvent("companySizeSelected", { 
      detail: { 
        size: d.data.name,
        data: d.data
      } 
    });
    document.dispatchEvent(selectEvent);
  }
  
  /**
   * Show detailed tooltip with formatted salary information
   * Uses D3's data join pattern for consistent tooltip management
   */
  showTooltip(event, d) {
    // Use data join pattern to create or update single tooltip element
    // selectAll().data([null]).join() ensures only one tooltip exists
    const tooltip = d3.select("body").selectAll(".treemap-tooltip")
      .data([null])
      .join("div")
      .attr("class", "treemap-tooltip")
      .style("position", "absolute")
      .style("background", "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,249,250,0.95) 100%)")
      .style("color", "#2c3e50")
      .style("padding", "12px 16px")
      .style("border-radius", "8px")
      .style("font-size", "13px")
      .style("border", "1px solid rgba(0,0,0,0.1)")
      .style("pointer-events", "none")
      .style("z-index", "10000")
      .style("box-shadow", "0 4px 20px rgba(0,0,0,0.15)")
      .style("backdrop-filter", "blur(10px)");
    
    // Format salary values consistently across dashboard
    const formatSalary = (salary) => {
      if (!salary || salary === 0) return "$0.00k";
      return `$${(salary / 1000).toFixed(2)}k`;
    };
    
    // Build structured HTML content for tooltip
    tooltip.html(`
      <div style="font-weight: 600; color: #1976d2; margin-bottom: 8px;">${d.data.name}</div>
      <div style="margin: 4px 0;"><strong>Job Count:</strong> ${d.data.jobs}</div>
      <div style="margin: 4px 0;"><strong>Average Salary:</strong> ${formatSalary(d.data.avgSalary)}</div>
      <div style="margin: 4px 0;"><strong>Salary Range:</strong> ${formatSalary(d.data.minSalary)} - ${formatSalary(d.data.maxSalary)}</div>
    `)
      .style("left", (event.pageX + 15) + "px")
      .style("top", (event.pageY - 10) + "px")
      .style("opacity", 1);
  }
  
  /**
   * Hide tooltip with smooth fade-out transition
   * Provides clean exit animation for better user experience
   */
  hideTooltip() {
    // d3.select() finds tooltip element and applies opacity transition
    d3.select(".treemap-tooltip").style("opacity", 0);
  }
}