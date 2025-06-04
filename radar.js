/*
  Interactive Radar Chart for Skills Comparison
  Visualizes user skills vs industry averages across multiple dimensions
  Features real-time input controls, smooth animations, and personalized learning recommendations
*/

class RadarChart {
  constructor(containerId) {
    // d3.select() creates D3 selection object for DOM element manipulation
    this.container = d3.select(containerId);
    this.width = 400;
    this.height = 300;
    // Calculate radar chart radius with padding for labels
    this.radius = Math.min(this.width, this.height) / 2 - 40;
    
    // Create main flexbox container for chart and controls layout
    this.mainDiv = this.container.append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "30px")
      .style("justify-content", "center");
    
    // Create chart container on the left side
    this.chartDiv = this.mainDiv.append("div");
    this.svg = this.chartDiv.append("svg")
      .attr("width", this.width)
      .attr("height", this.height);
      
    // Create centered group element for radar chart content
    // transform attribute positions group at center of SVG coordinate system
    this.g = this.svg.append("g")
      .attr("transform", `translate(${this.width/2},${this.height/2})`);
      
    // Define skill categories for consistent tracking
    this.skills = ["Python", "R", "Spark", "AWS/Cloud", "Excel"];
    this.userSkills = [0, 0, 0, 0, 0];
    this.industryAvg = [0, 0, 0, 0, 0];
    
    this.init();
  }
  
  /**
   * Initialize radar chart components and layout
   * Sets up scales, grid, labels, and control interface
   */
  init() {
    // Calculate angle between each skill axis for equal distribution
    this.angleSlice = Math.PI * 2 / this.skills.length;
    
    // Create radial scale mapping values to pixel distances from center
    // d3.scaleLinear() creates linear mapping from domain to range
    this.rScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, this.radius]);
    
    this.drawGrid();
    this.drawAxisLabels();
    this.createControlPanel();
  }
  
  /**
   * Draw radar chart grid with concentric circles and radial axes
   * Creates visual reference structure for data interpretation
   */
  drawGrid() {
    // Draw concentric circles for value reference
    const levels = 5;
    for (let level = 1; level <= levels; level++) {
      // append() creates new circle element with calculated radius
      this.g.append("circle")
        .attr("r", this.radius * level / levels)
        .attr("fill", "none")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-width", 1)
        .style("opacity", 0.8);
    }
    
    // Add percentage labels for grid levels
    for (let level = 1; level <= levels; level++) {
      this.g.append("text")
        .attr("x", 5)
        .attr("y", -this.radius * level / levels + 3)
        .attr("font-size", "9px")
        .attr("fill", "#999")
        .text(`${level * 20}%`);
    }
    
    // Draw radial axis lines from center to edge
    this.skills.forEach((skill, i) => {
      // Calculate angle for this skill axis (starting from top)
      const angle = i * this.angleSlice - Math.PI / 2;
      // append() creates line element from center to edge
      this.g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", this.radius * Math.cos(angle))
        .attr("y2", this.radius * Math.sin(angle))
        .attr("stroke", "#e0e0e0")
        .attr("stroke-width", 1.5);
    });
  }
  
  /**
   * Draw skill labels around the radar chart perimeter
   * Positions text labels outside the chart area for each skill
   */
  drawAxisLabels() {
    this.skills.forEach((skill, i) => {
      const angle = i * this.angleSlice - Math.PI / 2;
      // Calculate label position outside chart radius
      const x = (this.radius + 25) * Math.cos(angle);
      const y = (this.radius + 25) * Math.sin(angle);
      
      // append() creates text element at calculated position
      this.g.append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("fill", "#333")
        .text(skill);
    });
  }
  
  /**
   * Create interactive control panel for skill level input
   * Builds right-side interface with sliders for each skill
   */
  createControlPanel() {
    // Create control panel container on the right side
    const panel = this.mainDiv.append("div")
      .attr("class", "skill-controls")
      .style("background", "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)")
      .style("padding", "20px")
      .style("border-radius", "8px")
      .style("border", "1px solid #dee2e6")
      .style("min-width", "280px")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.1)");
    
    // Add control panel title
    panel.append("h4")
      .text("Set Your Skill Level:")
      .style("margin", "0 0 15px 0")
      .style("text-align", "center")
      .style("color", "#495057")
      .style("font-size", "16px");
    
    // Create slider control for each skill
    this.skills.forEach((skill, i) => {
      // Create container div for each skill control row
      const skillDiv = panel.append("div")
        .style("margin", "12px 0")
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "space-between");
      
      // Add skill name label
      skillDiv.append("label")
        .text(skill)
        .style("width", "80px")
        .style("font-size", "13px")
        .style("font-weight", "500")
        .style("color", "#495057");
      
      // Create range slider input for skill level
      const slider = skillDiv.append("input")
        .attr("type", "range")
        .attr("min", 0)
        .attr("max", 1)
        .attr("step", 0.1)
        .attr("value", 0)
        .style("width", "140px")
        .style("margin", "0 10px")
        .style("accent-color", "#667eea")
        // on() method attaches event listener for input changes
        .on("input", (event) => {
          // Update user skill array and trigger chart update
          this.userSkills[i] = +event.target.value;
          this.update();
          
          // Add visual feedback animation for skill change
          this.animateSkillChange(i);
        });
      
      // Add percentage display for current slider value
      skillDiv.append("span")
        .attr("class", `skill-value-${i}`)
        .text("0%")
        .style("width", "35px")
        .style("font-size", "12px")
        .style("text-align", "right")
        .style("font-weight", "bold")
        .style("color", "#667eea");
    });
  }
  
  /**
   * Animate skill change with visual feedback effect
   * Creates expanding circle animation when user adjusts skill level
   */
  animateSkillChange(skillIndex) {
    const angle = skillIndex * this.angleSlice - Math.PI / 2;
    const r = this.rScale(this.userSkills[skillIndex]);
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    
    // Create temporary circle with expand-and-fade animation
    this.g.append("circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 8)
      .attr("fill", "#667eea")
      .style("opacity", 0.8)
      // transition() creates smooth animated changes
      .transition()
      .duration(600)
      .attr("r", 15)
      .style("opacity", 0)
      // remove() deletes element after animation completes
      .remove();
  }
  
  /**
   * Update industry average data based on job track selection
   * Calculates skill frequency across filtered job postings
   */
  updateIndustryAverage(data, selectedTrack = null) {
    // Filter data to selected job track if specified
    let filteredData = data;
    if (selectedTrack) {
      filteredData = data.filter(d => this.categorizeJob(d.title) === selectedTrack);
    }
    
    if (filteredData.length === 0) return;
    
    // Map skill names to database field names
    const skillFields = ["python_yn", "R_yn", "spark", "aws", "excel"];
    
    // Calculate skill frequency as percentage for each skill
    this.industryAvg = skillFields.map(field => {
      const skillCount = filteredData.filter(d => d[field] === 1).length;
      return skillCount / filteredData.length;
    });
    
    this.update();
  }
  
  /**
   * Update radar chart visualization with current data
   * Refreshes both user skills and industry average displays
   */
  update() {
    // Update percentage displays in control panel
    this.skills.forEach((skill, i) => {
      // select() finds element by class and updates text content
      this.container.select(`.skill-value-${i}`)
        .text(`${(this.userSkills[i] * 100).toFixed(0)}%`);
    });
    
    // Clear existing radar paths and data points
    // selectAll() selects all matching elements for removal
    this.g.selectAll(".radar-path").remove();
    this.g.selectAll(".radar-dot").remove();
    
    // Draw industry average line if data exists
    if (this.industryAvg.some(d => d > 0)) {
      this.drawRadarPath(this.industryAvg, "#ff7f0e", "Industry Average", 0.3);
    }
    
    // Draw user skills line if any skills are set
    if (this.userSkills.some(d => d > 0)) {
      this.drawRadarPath(this.userSkills, "#1f77b4", "Your Skills", 1.5);
    }
    
    // Add chart legend and learning recommendations
    this.drawLegend();
    this.generateRecommendations();
  }
  
  /**
   * Draw radar path with filled area and data points
   * Creates connected polygon showing skill levels across all dimensions
   */
  drawRadarPath(data, color, label, opacity) {
    // Convert skill values to screen coordinates
    const pathData = data.map((value, i) => {
      const angle = i * this.angleSlice - Math.PI / 2;
      const r = this.rScale(value);
      return [r * Math.cos(angle), r * Math.sin(angle)];
    });
    
    // Close the path by adding first point at the end
    pathData.push(pathData[0]);
    
    // Create line generator for connecting data points
    // d3.line() generates SVG path string from coordinate pairs
    const line = d3.line()
      .x(d => d[0])
      .y(d => d[1])
      // curveLinearClosed creates closed polygon with straight line segments
      .curve(d3.curveLinearClosed);
    
    // Draw filled area path representing skill coverage
    this.g.append("path")
      // datum() binds single data element to selection
      .datum(pathData)
      .attr("class", "radar-path")
      .attr("d", line)
      .attr("fill", color)
      .attr("fill-opacity", 0.15)
      .attr("stroke", color)
      .attr("stroke-width", 3)
      .style("opacity", 0)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");
    
    // Draw individual data points as circles
    data.forEach((value, i) => {
      const angle = i * this.angleSlice - Math.PI / 2;
      const r = this.rScale(value);
      
      this.g.append("circle")
        .attr("class", "radar-dot")
        .attr("cx", r * Math.cos(angle))
        .attr("cy", r * Math.sin(angle))
        .attr("r", 5)
        .attr("fill", color)
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("opacity", 0)
        .style("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.3))");
    });
    
    // Entrance animations with staggered timing
    this.g.selectAll(".radar-path")
      .transition()
      .duration(800)
      .style("opacity", opacity);
    
    this.g.selectAll(".radar-dot")
      .transition()
      .duration(800)
      .delay(400)
      .style("opacity", 1);
  }
  
  /**
   * Draw chart legend explaining line colors and meanings
   * Provides visual reference for interpreting multiple data series
   */
  drawLegend() {
    // Remove existing legend before redrawing
    this.g.selectAll(".legend").remove();
    
    // Create legend group positioned below chart with better spacing
    const legend = this.g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${-this.radius}, ${this.radius + 30})`);
  
    // Define legend entries with colors and labels
    const legendData = [
      { color: "#ff7f0e", label: "Industry Average" },
      { color: "#1f77b4", label: "Your Skills" }
    ];
    
    // Create legend entry for each data series with improved spacing
    legendData.forEach((d, i) => {
      const g = legend.append("g")
        .attr("transform", `translate(${i * 120}, 0)`);
    
      // Draw color line indicator
      g.append("line")
        .attr("x1", 0)
        .attr("x2", 15)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", d.color)
        .attr("stroke-width", 3);
    
      // Add text label next to color indicator
      g.append("text")
        .attr("x", 20)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("fill", "#333")
        .text(d.label);
    });
  }
  
  /**
   * Generate personalized learning recommendations based on skill gaps
   * Analyzes differences between user skills and industry averages
   */
  generateRecommendations() {
    // Use data join pattern to create or update recommendations section
    // selectAll().data([null]).join() ensures single element creation
    const recommendations = this.container.selectAll(".recommendations")
      .data([null])
      .join("div")
      .attr("class", "recommendations")
      .style("margin-top", "20px")
      .style("padding", "15px")
      .style("background", "linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)")
      .style("border-radius", "8px")
      .style("border-left", "4px solid #667eea")
      .style("font-size", "13px");
    
    recommendations.html("<strong>📚 Learning Recommendations:</strong>");
    
    const hasIndustryData = this.industryAvg.some(d => d > 0);
    
    if (!hasIndustryData) {
      recommendations.append("div")
        .style("margin-top", "8px")
        .style("color", "#757575")
        .style("font-style", "italic")
        .text("Select a state or job track to see industry skill requirements");
      return;
    }
    
    // Calculate skill gaps by comparing industry avg to user skills
    const gaps = this.skills.map((skill, i) => ({
      skill,
      gap: this.industryAvg[i] - this.userSkills[i],
      industryAvg: this.industryAvg[i],
      userSkill: this.userSkills[i],
      index: i
    }))
    .filter(d => d.industryAvg > 0 && d.gap > 0.05)
    .sort((a, b) => b.gap - a.gap);
    
    // Display appropriate message based on skill gaps
    if (gaps.length === 0) {
      const skillsWithDemand = this.skills.map((skill, i) => ({
        skill,
        industryAvg: this.industryAvg[i],
        userSkill: this.userSkills[i],
        meets: this.userSkills[i] >= this.industryAvg[i]
      })).filter(d => d.industryAvg > 0);
      
      if (skillsWithDemand.length === 0) {
        recommendations.append("div")
          .style("margin-top", "8px")
          .style("color", "#757575")
          .text("No skill data available for current selection");
      } else {
        const allSkillsMeet = skillsWithDemand.every(d => d.meets);
        
        if (allSkillsMeet) {
          recommendations.append("div")
            .style("margin-top", "8px")
            .style("color", "#2e7d32")
            .style("font-weight", "bold")
            .text("Your skills meet or exceed industry standards!");
        } else {
          recommendations.append("div")
            .style("margin-top", "8px")
            .style("color", "#ff9800")
            .style("font-weight", "bold")
            .text("You're close to industry standards!");
          
          const minorGaps = skillsWithDemand.filter(d => !d.meets && (d.industryAvg - d.userSkill) <= 0.05);
          if (minorGaps.length > 0) {
            const list = recommendations.append("ul")
              .style("margin", "8px 0 0 0")
              .style("padding-left", "20px");
            
            minorGaps.forEach(gap => {
              list.append("li")
                .style("margin", "4px 0")
                .style("color", "#424242")
                .style("font-size", "12px")
                .html(`<strong>${gap.skill}</strong>: ${(gap.userSkill * 100).toFixed(0)}% → ${(gap.industryAvg * 100).toFixed(0)}% (small gap)`);
            });
          }
        }
      }
    } else {
      // Create ordered list of top skill improvement areas
      const list = recommendations.append("ul")
        .style("margin", "8px 0 0 0")
        .style("padding-left", "20px");
      
      // Show top 3 skill gaps with improvement suggestions
      gaps.slice(0, 3).forEach(gap => {
        list.append("li")
          .style("margin", "4px 0")
          .style("color", "#424242")
          .html(`Improve <strong>${gap.skill}</strong> skills<br>
                <span style="font-size: 11px; color: #666;">
                  Industry avg: ${(gap.industryAvg * 100).toFixed(0)}% | 
                  Your level: ${(gap.userSkill * 100).toFixed(0)}% | 
                  Gap: ${(gap.gap * 100).toFixed(0)}%
                </span>`);
      });
    }
  }
  
  /**
   * Categorize job titles into standard career tracks
   * Provides consistent job classification for filtering
   */
  categorizeJob(jobTitle) {
    const title = jobTitle.toLowerCase();
    if (title.includes("data scientist")) return "Data Scientist";
    if (title.includes("data engineer")) return "Data Engineer";
    if (title.includes("data analyst") || title.includes("analyst")) return "Data Analyst";
    if (title.includes("machine learning") || title.includes("ml engineer")) return "ML Engineer";
    return "Other";
  }
}