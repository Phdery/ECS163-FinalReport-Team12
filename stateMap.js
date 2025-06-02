/*
  US Salary Choropleth Map – D3 v7
  Interactive map showing salary distribution across US states
  Features hover effects, tooltips, and state selection functionality
*/

// No need for import statements since libraries are loaded in HTML
console.log("D3 version:", d3.version);
console.log("TopoJSON feature function:", typeof topojson.feature);

//--------------------------------------------
// CONFIGURATION
//--------------------------------------------
const width = 960,
      height = 600,
      // Color interpolation functions for temperature mapping
      warm = d3.interpolateOranges,
      cool = d3.interpolateGnBu,
      // d3.scaleLinear() creates linear scale mapping sample size to border width
      borderScale = d3.scaleLinear([20, 5000], [0.5, 4]); // sample → stroke-width

// d3.select() selects DOM element and creates D3 selection object
const svg = d3.select("#map")
  .attr("width", width)
  .attr("height", height)
  .style("background-color", "#f9f9f9") // Add background color for visibility
  .style("display", "block") // Ensure proper display mode
  .style("margin", "0 auto") // Center horizontally
  .attr("viewBox", [0, 0, width, height]); // Set responsive viewBox

// Debug: Check if SVG element is properly selected
console.log("SVG element:", svg.node());

// Global state store for cross-component communication
window.store = window.store || {};

// Create tooltip element for state information display
const tooltip = d3.select("body").append("div")
  .attr("id", "tooltip")
  .style("position", "absolute")
  .style("background", "rgba(0, 0, 0, 0.9)")
  .style("color", "white")
  .style("padding", "8px 12px")
  .style("border-radius", "4px")
  .style("font-size", "12px")
  .style("font-family", "Arial, sans-serif")
  .style("pointer-events", "none")
  .style("opacity", 0)
  .style("z-index", "10000")
  .style("white-space", "nowrap")
  .style("box-shadow", "0 4px 12px rgba(0,0,0,0.4)")
  .style("border", "1px solid rgba(255,255,255,0.2)");

//--------------------------------------------
// DATA LOADING AND PROCESSING
//--------------------------------------------
// Promise.all() loads multiple data sources concurrently
Promise.all([
  // d3.json() loads and parses JSON data asynchronously
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
  // d3.csv() loads and parses CSV with data transformation function
  d3.csv("salary_data_cleaned.csv", d => {
    // Extract state abbreviation from Location field using regex
    let state = "";
    if (d.Location) {
      const match = d.Location.match(/,\s*([A-Z]{2})\s*$/);
      state = match ? match[1] : "";
    }
    
    // Parse salary values correctly - handle different field names and formats
    let avgSalary = 0;
    
    // Try different possible field names for salary data
    if (d.avg_salary) {
      avgSalary = parseFloat(d.avg_salary.toString().replace(/,/g, '')) || 0;
    } else if (d['Salary Estimate']) {
      // Extract numeric values from salary estimate strings like "$50K-$80K"
      const salaryMatch = d['Salary Estimate'].match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)[Kk]?/g);
      if (salaryMatch && salaryMatch.length >= 1) {
        const salary = parseFloat(salaryMatch[0].replace(/[$,Kk]/g, ''));
        // If value is in thousands format (like "50K"), multiply by 1000
        avgSalary = salaryMatch[0].includes('K') || salaryMatch[0].includes('k') ? salary * 1000 : salary;
      }
    }
    
    // Ensure salary is in reasonable range (30k - 300k)
    if (avgSalary > 0 && avgSalary < 1000) {
      avgSalary = avgSalary * 1000; // Convert from thousands to actual dollars
    }
    
    // Return transformed data object with type conversion
    return {
      state: state,
      avg: avgSalary,    // Corrected salary parsing
      min: parseFloat((d.min_salary || '').toString().replace(/,/g, '')) || avgSalary * 0.8,
      max: parseFloat((d.max_salary || '').toString().replace(/,/g, '')) || avgSalary * 1.2,
      title: d["Job Title"] || "",
      location: d.Location || "",
      company: d["Company Name"] || "",
      size: d.Size || "",
      revenue: d.Revenue || "",
      // Skill flags converted to numbers
      python_yn: +(d.python_yn || 0),
      R_yn: +(d.R_yn || 0),
      spark: +(d.spark || 0),
      aws: +(d.aws || 0),
      excel: +(d.excel || 0),
      // Additional metadata
      rating: +d.Rating || 0,
      founded: +d.Founded || 0,
      industry: d.Industry || "",
      sector: d.Sector || ""
    };
  })
]).then(([usTopo, rows]) => {
  // Filter out records with invalid or zero salaries
  const validRows = rows.filter(d => d.avg > 0 && d.state);
  
  // Debug: Check salary data after parsing
  console.log("Salary data sample after parsing:", validRows.slice(0, 5).map(d => ({
    state: d.state,
    avgSalary: d.avg,
    title: d.title
  })));
  
  // Debug: Check unique state abbreviations in CSV
  console.log("State abbreviations in CSV:", [...new Set(validRows.map(d => d.state))]);
  
  // Group salary data by state using d3.group()
  // d3.group() creates Map grouped by key function
  const byState = d3.group(validRows, d => d.state);
  
  // Debug: Check grouped data structure
  console.log("Data grouped by state:", byState);
  
  // Calculate state statistics with correct salary aggregation
  const stateStats = Array.from(byState, ([state, list]) => {
    return {
      state: state.trim(), // Remove potential whitespace
      n: list.length,      // Number of job postings
      // d3.mean() calculates average salary for each state
      avg: d3.mean(list, d => d.avg)
    };
  }).filter(d => d.avg > 0); // Filter out states with invalid averages
  
  // Debug: Check state statistics with actual salary values
  console.log("State statistics sample:", stateStats.slice(0, 5));
  
  // d3.median() calculates national median salary for comparison
  const nationalMedian = d3.median(stateStats, d => d.avg);
  console.log("National median salary:", nationalMedian);

  // Create Map for O(1) state data lookup
  const salaryMap = new Map(stateStats.map(d => [d.state, d]));
  
  // Debug: Show salary range for validation
  const salaryValues = stateStats.map(d => d.avg);
  console.log("Salary range:", {
    min: d3.min(salaryValues),
    max: d3.max(salaryValues),
    median: d3.median(salaryValues)
  });

  // Extract state features from TopoJSON using topojson.feature()
  // topojson.feature() converts TopoJSON to GeoJSON features
  const states = topojson.feature(usTopo, usTopo.objects.states).features;
  
  // FIPS code to state abbreviation mapping table (complete mapping for all US states)
  const fipsToAbbr = {
    "01":"AL", "02":"AK", "04":"AZ", "05":"AR", "06":"CA", 
    "08":"CO", "09":"CT", "10":"DE", "12":"FL", "13":"GA",
    "15":"HI", "16":"ID", "17":"IL", "18":"IN", "19":"IA",
    "20":"KS", "21":"KY", "22":"LA", "23":"ME", "24":"MD",
    "25":"MA", "26":"MI", "27":"MN", "28":"MS", "29":"MO",
    "30":"MT", "31":"NE", "32":"NV", "33":"NH", "34":"NJ",
    "35":"NM", "36":"NY", "37":"NC", "38":"ND", "39":"OH",
    "40":"OK", "41":"OR", "42":"PA", "44":"RI", "45":"SC",
    "46":"SD", "47":"TN", "48":"TX", "49":"UT", "50":"VT",
    "51":"VA", "53":"WA", "54":"WV", "55":"WI", "56":"WY"
  };

  // COLOR MAPPING FUNCTION
  // Determines fill color based on salary comparison to national median
  function stateColor(s) {
    // Get state abbreviation from FIPS code
    const abbr = fipsToAbbr[s.id];
    
    // Lookup salary data for this state
    const rec = abbr ? salaryMap.get(abbr) : null;
    
    // Return neutral gray if no data available
    if (!rec) return "#ddd";
    
    // Calculate relative difference from national median
    const t = (rec.avg - nationalMedian) / nationalMedian;
    // Use red scale for above-median, blue scale for below-median
    // d3.interpolateReds() and d3.interpolateBlues() provide color interpolation
    return t >= 0 ? d3.interpolateReds(Math.min(t, 1) * 0.7 + 0.3) : d3.interpolateBlues(Math.min(-t, 1) * 0.7 + 0.3);
  }

  //----------------------------------------
  // MAP RENDERING
  //----------------------------------------
  // Add background rectangle for visual reference
  svg.insert("rect", ":first-child")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "#f0f0f0");

  // Create Albers USA projection fitted to viewport
  // d3.geoAlbersUsa() provides optimized projection for US maps
  const projection = d3.geoAlbersUsa()
    // fitSize() scales and translates projection to fit given dimensions
    .fitSize([width, height], topojson.feature(usTopo, usTopo.objects.states));
    
  // Create path generator using the projection
  // d3.geoPath() converts GeoJSON features to SVG path strings
  const path = d3.geoPath().projection(projection);

  // Clear any existing paths before redrawing
  // selectAll() selects all matching elements for data binding
  svg.selectAll("path").remove();

  // Create state paths with interactive features
  svg.append("g")
    .selectAll("path")
    .data(states) // Bind state feature data
    .join("path") // Create path elements for each state using data join
      .attr("d", path) // Set path data using path generator
      .attr("fill", stateColor) // Apply color based on salary data
      .attr("stroke", "#333") // Dark border color
      .attr("stroke-width", 1.5) // Increase border width for visibility
      .attr("opacity", 1) // Full opacity
      .style("transition", "all 0.3s ease") // Add smooth transitions for interactions
      .style("cursor", "pointer") // Show pointer cursor on hover
      // MOUSEOVER EVENT: Highlight and show tooltip
      .on("mouseover", function(event, d) {
        const stateAbbr = fipsToAbbr[d.id];
        
        // Bring hovered state to front by setting high z-index
        // parentNode.appendChild() moves element to end of parent, making it render last (on top)
        this.parentNode.appendChild(this);
        
        // Apply visual emphasis using d3 transitions
        // d3.select(this) selects current element, transition() creates smooth animation
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke-width", 4) // Thicker border
          .attr("stroke", "#000") // Black border
          .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.5))"); // Enhanced shadow effect
        
        // Show tooltip with state information
        if (stateAbbr) {
          const stateData = salaryMap.get(stateAbbr);
          if (stateData) {
            // Use mouse position directly for more precise tooltip positioning
            // This ensures tooltip appears right next to the cursor
            const mouseX = event.pageX;
            const mouseY = event.pageY;
            
            // Position tooltip very close to mouse cursor with small offset
            const tooltipX = mouseX + 10;
            const tooltipY = mouseY - 50;
            
            // d3.select() gets tooltip element and modifies its properties
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`
              <div style="font-weight: bold; margin-bottom: 4px;">${stateAbbr}</div>
              <div>Jobs: ${stateData.n}</div>
              <div>Avg Salary: $${(stateData.avg / 1000).toFixed(0)}k</div>
              <div style="font-size: 11px; margin-top: 4px; opacity: 0.8;">
                ${stateData.avg > nationalMedian ? 'Above' : 'Below'} national median
              </div>
            `)
              .style("left", tooltipX + "px")
              .style("top", tooltipY + "px");
          }
        }
      })
      // MOUSEOUT EVENT: Reset visual state
      .on("mouseout", function() {
        // Restore original appearance
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke-width", 1.5) // Reset border
          .attr("stroke", "#333") // Reset border color
          .style("filter", "none"); // Remove shadow
        
        // Hide tooltip
        tooltip.transition().duration(200).style("opacity", 0);
      })
      // CLICK EVENT: State selection with feedback animation
      .on("click", function(event, d) {
        // Provide tactile feedback with squeeze animation
        d3.select(this)
          .transition()
          .duration(100)
          .style("transform", "scale(0.95)") // Compress
          .transition()
          .duration(200)
          .style("transform", "scale(1.05)") // Expand
          .transition()
          .duration(200)
          .style("transform", "scale(1)"); // Return to normal
        
        // Get state abbreviation
        const stateAbbr = fipsToAbbr[d.id];
        if (stateAbbr) {
          // Dispatch custom event for state selection
          const selectEvent = new CustomEvent("stateSelected", { 
            detail: { state: stateAbbr } 
          });
          document.dispatchEvent(selectEvent);
        }
      });

  // Add color legend for salary interpretation positioned to cover about 1/10 of map width
  const legendWidth = width * 0.18; // Approximately 1/5 of map width for better visibility
  const legendHeight = 20;
  const legendX = width - legendWidth - width * 0.1; // Position further left from right edge
  const legendY = 30; // Position in upper area
  
  // Create legend group
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${legendX}, ${legendY})`);
  
  // Create gradient definition for legend
  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", "salary-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%");
  
  // Add gradient stops for color scale
  gradient.append("stop")
    .attr("offset", "0%")
    .attr("style", "stop-color:" + d3.interpolateBlues(0.7) + ";stop-opacity:1");
  
  gradient.append("stop")
    .attr("offset", "50%")
    .attr("style", "stop-color:#ddd;stop-opacity:1");
    
  gradient.append("stop")
    .attr("offset", "100%")
    .attr("style", "stop-color:" + d3.interpolateReds(0.7) + ";stop-opacity:1");
  
  // Add legend rectangle with gradient fill (no background, transparent)
  legend.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", "url(#salary-gradient)")
    .attr("stroke", "#333")
    .attr("stroke-width", 1);
  
  // Add legend labels
  legend.append("text")
    .attr("x", 0)
    .attr("y", legendHeight + 15)
    .attr("font-size", "10px")
    .attr("fill", "#333")
    .text("Below Median");
  
  legend.append("text")
    .attr("x", legendWidth / 2)
    .attr("y", legendHeight + 15)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("fill", "#333")
    .text(`$${(nationalMedian / 1000).toFixed(0)}k`);
  
  legend.append("text")
    .attr("x", legendWidth)
    .attr("y", legendHeight + 15)
    .attr("text-anchor", "end")
    .attr("font-size", "10px")
    .attr("fill", "#333")
    .text("Above Median");
  
  // Add legend title
  legend.append("text")
    .attr("x", legendWidth / 2)
    .attr("y", -8)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .attr("fill", "#333")
    .text("Average Salary");

  // Store processed data globally for other components
  window.debugData = {
    states: states,
    byState: byState,
    stateStats: stateStats,
    fipsToAbbr: fipsToAbbr,
    usTopo: usTopo,
    rows: validRows  // Use filtered valid data
  };
  
  console.log("Map rendering completed");
}).catch(error => {
  // Error handling for data loading failures
  console.error("Error loading data:", error);
});

// POST-RENDER VALIDATION
// Check if map paths were actually added to DOM after rendering
setTimeout(() => {
  // selectAll().nodes() returns array of actual DOM elements
  const paths = svg.selectAll("path").nodes();
  console.log(`Actual number of paths created: ${paths.length}`);
  
  // Inspect first path element attributes
  if (paths.length > 0) {
    const firstPath = d3.select(paths[0]);
    console.log("First path fill color:", firstPath.attr("fill"));
    console.log("First path stroke color:", firstPath.attr("stroke"));
    console.log("First path stroke width:", firstPath.attr("stroke-width"));
    console.log("First path opacity:", firstPath.attr("opacity"));
    console.log("First path data:", firstPath.attr("d").substring(0, 50) + "...");
  }
}, 1000);

//--------------------------------------------
// DYNAMIC STYLING
//--------------------------------------------
const style = document.createElement("style");
style.textContent = `
  .map-tooltip{background:#fff;border:1px solid #ccc;padding:6px 10px;border-radius:4px;font:12px sans-serif;}
  path.selected{stroke:#000;stroke-width:4px !important;}
  .legend text{font-family: Arial, sans-serif;}
`;
document.head.appendChild(style);

// DEBUGGING UTILITIES
// Global functions for development and troubleshooting
window.debugMap = {
  showStateMappings: () => {
    if (!window.debugData) {
      console.error("Data not loaded yet");
      return;
    }
    
    const mappings = window.debugData.states.map(s => {
      const abbr = window.debugData.fipsToAbbr[s.id];
      const hasData = window.debugData.byState.has(abbr);
      return {fips: s.id, abbr, hasData};
    });
    
    console.table(mappings);
  }
};
