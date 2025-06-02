/*
  State-level Job Track Comparison: Sunburst + Treemap Combined Visualization
  Interactive sunburst chart showing hierarchical relationship between job categories and required skills
  Features smooth animations, tooltips, and cross-component communication
*/

// Global state variables for component coordination
let skillsData;
let selectedState = null;
let isVisualizationVisible = false;

// Skill clustering configuration
// Maps database field names to user-friendly display names
const skillClusters = {
    "python_yn": "Python",
    "R_yn": "R",
    "spark": "Spark",
    "aws": "AWS/Cloud",
    "excel": "Excel"
};

// Sunburst chart dimensions and visual configuration
const sunburstWidth = 300;
const sunburstHeight = 300;
const radius = Math.min(sunburstWidth, sunburstHeight) / 2 - 10;
// d3.scaleOrdinal() creates categorical color scale with predefined color scheme
// d3.schemeSet3 provides a set of 12 distinct colors for categorical data
const color = d3.scaleOrdinal(d3.schemeSet3);

/**
 * Initialize skills visualization system
 * Sets up event listeners and initial container state
 */
function initSkillsViz() {
    // Show initial placeholder message when no state is selected
    clearSunburstContainer();
    
    // Listen for state selection events from map component
    // Custom events enable loose coupling between visualization components
    document.addEventListener("stateSelected", function(e) {
        const clickedState = e.detail.state;
        selectedState = clickedState;
        updateSkillsViz(selectedState);
    });
}

/**
 * Update skills visualization based on selected state
 * Main entry point for data updates from external components
 */
function updateSkillsViz(state) {
    // Access globally available dashboard data
    if (window.dashboard && window.dashboard.data) {
        // Filter dataset to only include jobs from selected state
        const stateData = window.dashboard.data.filter(d => d.state === state);
        if (stateData.length > 0) {
            processStateData(stateData, state);
            return;
        }
    }
    
    // Clear container if no valid data is available
    clearSunburstContainer();
}

/**
 * Clear container and show placeholder message
 * Used when no state is selected or no data is available
 */
function clearSunburstContainer() {
    // d3.select() creates D3 selection object for DOM manipulation
    const container = d3.select(".sunburst-container");
    // selectAll() selects all matching child elements for removal
    container.selectAll("svg").remove();
    container.selectAll("p").remove();
    // append() adds new paragraph element with instructional text
    container.append("p")
        .style("text-align", "center")
        .style("color", "#666")
        .style("margin-top", "50px")
        .text("Click a state to see job tracks and skills");
}

/**
 * Create or update the sunburst container
 * Manages SVG creation and title updates for state transitions
 */
function createOrUpdateContainer(stateName) {
    // Clear previous visualization content
    const container = d3.select(".sunburst-container");
    container.selectAll("svg").remove();
    container.selectAll("p").remove();
    
    // Update container title to show selected state
    container.select("h3")
        .text(`${stateName} - Job Tracks & Skills`);
    
    // Create new SVG element for sunburst chart
    const svg = container.append("svg")
        .attr("width", sunburstWidth)
        .attr("height", sunburstHeight)
        .style("display", "block")
        .style("margin", "0 auto");
    
    // Create group element for chart content, centered in SVG
    // transform attribute positions group at center of SVG coordinate system
    const g = svg.append("g")
        .attr("transform", `translate(${sunburstWidth / 2}, ${sunburstHeight / 2})`);
    
    return g;
}

/**
 * Process state data and render sunburst chart
 * Coordinates data transformation and visualization rendering
 */
function processStateData(stateData, state) {
    // Create or update the SVG container for new state
    const svgGroup = createOrUpdateContainer(state);
    
    // Transform flat job data into hierarchical structure
    const hierarchyData = buildHierarchyData(stateData);
    
    // Render the sunburst visualization with processed data
    drawSunburst(hierarchyData, state, svgGroup);
}

/**
 * Build hierarchical data structure for sunburst chart
 * Transforms flat job data into nested job categories and skill frequencies
 */
function buildHierarchyData(stateData) {
    const jobTitles = {};
    
    // Process each job record to build category structure
    stateData.forEach(d => {
        let jobCategory = categorizeJob(d.title || "");
        
        // Initialize job category structure if not exists
        if (!jobTitles[jobCategory]) {
            jobTitles[jobCategory] = {
                name: jobCategory,
                value: 0,
                children: []
            };
            
            // Create child nodes for each skill cluster
            Object.keys(skillClusters).forEach(skill => {
                jobTitles[jobCategory].children.push({
                    name: skillClusters[skill],
                    value: 0,
                    skill: skill
                });
            });
        }
        
        // Increment job count for this category
        jobTitles[jobCategory].value++;
        
        // Count skill occurrences within job category
        Object.keys(skillClusters).forEach(skill => {
            // Check if job requires this skill (handles both string "1" and number 1)
            if (d[skill] === "1" || d[skill] === 1) {
                const skillNode = jobTitles[jobCategory].children.find(
                    child => child.skill === skill
                );
                if (skillNode) {
                    skillNode.value++;
                }
            }
        });
    });
    
    // Return root node structure for D3 hierarchy
    return {
        name: "root",
        children: Object.values(jobTitles)
    };
}

/**
 * Categorize job titles into standard tracks
 * Uses keyword matching for consistent job classification across components
 */
function categorizeJob(jobTitle) {
    if (!jobTitle) return "Other";
    
    const title = jobTitle.toLowerCase();
    if (title.includes("data scientist")) return "Data Scientist";
    if (title.includes("data engineer")) return "Data Engineer";
    if (title.includes("data analyst") || title.includes("analyst")) return "Data Analyst";
    if (title.includes("machine learning") || title.includes("ml engineer")) return "ML Engineer";
    if (title.includes("software engineer") || title.includes("developer")) return "Software Engineer";
    return "Other";
}

/**
 * Render sunburst chart with animations and interactions
 * Creates the visual representation using D3's partition layout and arc generator
 */
function drawSunburst(hierarchyData, stateName, sunburstSvg) {
    // Clear any existing chart elements
    sunburstSvg.selectAll("*").remove();
    
    console.log("Drawing sunburst with hierarchical data:", hierarchyData);
    
    // Create partition layout for sunburst chart
    // d3.partition() computes angles and radii for hierarchical segments
    const partition = d3.partition()
        .size([2 * Math.PI, radius]);
    
    // Convert nested data to D3 hierarchy format
    // d3.hierarchy() creates tree structure with parent-child relationships
    const root = d3.hierarchy(hierarchyData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);
    
    // Apply partition layout to calculate segment positions
    partition(root);
    
    // Create arc generator for drawing sunburst segments
    // d3.arc() generates SVG path strings for circular segments
    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1);
    
    // Create path elements for each segment with data binding
    const paths = sunburstSvg.selectAll("path")
        .data(root.descendants())
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => {
            if (d.depth === 0) return "transparent";
            if (d.depth === 1) return color(d.data.name);
            // d3.color() creates color object for manipulation
            // brighter() method lightens color for child segments
            return d3.color(color(d.parent.data.name)).brighter(0.3);
        })
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("opacity", 0);
    
    // Entrance animation with elastic easing effect
    paths.transition()
        .duration(800)
        .delay((d, i) => i * 50)
        // d3.easeElasticOut provides bounce effect for engaging animation
        .ease(d3.easeElasticOut)
        .style("opacity", 0.9);
    
    // Add text labels for segments with sufficient space
    const labels = sunburstSvg.selectAll("text")
        .data(root.descendants().filter(d => {
            if (d.depth === 0) return false;
            const angle = d.x1 - d.x0;
            const radius = (d.y0 + d.y1) / 2;
            // Only show labels for segments large enough to be readable
            return angle * radius > 15;
        }))
        .enter()
        .append("text")
        .attr("transform", d => {
            const angle = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const radius = (d.y0 + d.y1) / 2;
            // Rotate text to follow arc curvature and flip for readability
            return `rotate(${angle - 90}) translate(${radius},0) rotate(${angle < 180 ? 0 : 180})`;
        })
        .attr("dy", "0.35em")
        .attr("text-anchor", d => {
            const angle = (d.x0 + d.x1) / 2;
            return angle < Math.PI ? "start" : "end";
        })
        .attr("font-size", d => d.depth === 1 ? "11px" : "9px")
        .attr("font-weight", d => d.depth === 1 ? "bold" : "normal")
        .attr("fill", "#333")
        .style("opacity", 0)
        .text(d => {
            if (d.depth === 1) {
                return `${d.data.name} (${d.value})`;
            }
            return d.data.name;
        });
    
    // Label entrance animation with delay after segments appear
    labels.transition()
        .duration(600)
        .delay(800)
        .style("opacity", 1);
    
    // Add interactive hover effects
    paths.on("mouseover", function(event, d) {
        if (d.depth === 0) return;
        
        // Highlight hovered segment with visual emphasis
        // d3.select(this) selects current element for styling
        d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 1)
            .attr("stroke-width", 3);
        
        showTooltip(event, d);
    })
    .on("mouseout", function(event, d) {
        if (d.depth === 0) return;
        
        // Restore normal segment appearance
        d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 0.9)
            .attr("stroke-width", 2);
        
        hideTooltip();
    });
}

/**
 * Show interactive tooltip with segment information
 * Displays job counts and skill frequency data
 */
function showTooltip(event, d) {
    // Use data join pattern to create or update tooltip
    // selectAll().data([null]).join() ensures single tooltip element
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
    
    // Format salary values consistently across components
    const formatSalary = (salary) => {
        if (!salary || salary === 0) return "$0.00k";
        return `$${(salary / 1000).toFixed(2)}k`;
    };
    
    // Build tooltip content with structured HTML
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
 * Hide tooltip with smooth transition
 * Provides clean exit animation for better user experience
 */
function hideTooltip() {
    // d3.select() finds tooltip element and applies fade-out transition
    d3.select(".sunburst-tooltip")
        .transition()
        .duration(200)
        .style("opacity", 0);
}

// Initialize visualization when DOM content is fully loaded
document.addEventListener("DOMContentLoaded", initSkillsViz);

/**
 * Utility function for programmatic state selection
 * Useful for testing and external component triggers
 */
function selectState(stateAbbr) {
    // Create and dispatch custom event for state selection
    const event = new CustomEvent("stateSelected", { 
        detail: { state: stateAbbr } 
    });
    document.dispatchEvent(event);
}