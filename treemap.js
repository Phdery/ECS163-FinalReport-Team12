// 公司规模薪资对比 - Treemap
class TreemapViz {
  constructor(containerId) {
    this.container = d3.select(containerId);
    this.width = 400;
    this.height = 300;
    this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
    
    this.svg = this.container.append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .style("background", "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)")
      .style("border-radius", "8px");
      
    // 使用更柔和的颜色方案
    this.colorScale = d3.scaleSequential()
      .interpolator(d3.interpolateRgb("#e8f4fd", "#1e88e5")); // 浅蓝到深蓝
    
    this.init();
  }
  
  init() {
    this.treemap = d3.treemap()
      .size([this.width - this.margin.left - this.margin.right, 
             this.height - this.margin.top - this.margin.bottom])
      .padding(2)
      .round(true);
      
    this.g = this.svg.append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
  }
  
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
  
  update(data, selectedTrack = null) {
    // 按职位类别过滤数据
    let filteredData = data;
    if (selectedTrack) {
      filteredData = data.filter(d => this.categorizeJob(d.title) === selectedTrack);
    }
    
    // 按公司规模分组
    const sizeGroups = d3.group(filteredData, d => this.categorizeCompanySize(d.size));
    
    // 构建层次数据
    const hierarchyData = {
      name: "root",
      children: Array.from(sizeGroups, ([size, jobs]) => ({
        name: size,
        value: jobs.length,
        avgSalary: d3.mean(jobs, d => d.avg),
        minSalary: d3.min(jobs, d => d.min),
        maxSalary: d3.max(jobs, d => d.max),
        jobs: jobs.length
      }))
    };
    
    // 更新颜色比例尺
    const salaries = hierarchyData.children.map(d => d.avgSalary).filter(d => d);
    if (salaries.length > 0) {
      const [minSalary, maxSalary] = d3.extent(salaries);
      this.colorScale.domain([minSalary, maxSalary]);
    }
    
    // 创建层次结构
    const root = d3.hierarchy(hierarchyData)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);
    
    this.treemap(root);
    
    // 绑定数据
    const cells = this.g.selectAll(".cell")
      .data(root.leaves(), d => d.data.name);
    
    // 退出动画
    cells.exit()
      .transition()
      .duration(500)
      .style("opacity", 0)
      .remove();
    
    // 进入 + 更新
    const cellsEnter = cells.enter()
      .append("g")
      .attr("class", "cell")
      .style("opacity", 0);
    
    const cellsUpdate = cellsEnter.merge(cells);
    
    // 添加矩形
    cellsEnter.append("rect");
    cellsEnter.append("text").attr("class", "size-label");
    cellsEnter.append("text").attr("class", "salary-label");
    cellsEnter.append("g").attr("class", "sparkline");
    
    // 更新矩形
    cellsUpdate.select("rect")
      .transition()
      .duration(800)
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", d => {
        if (!d.data.avgSalary || d.data.avgSalary === 0) {
          return "#f1f3f4"; // 更浅的灰色
        }
        return this.colorScale(d.data.avgSalary);
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 3)
      .attr("rx", 4) // 圆角
      .attr("ry", 4)
      .style("filter", "drop-shadow(0 2px 8px rgba(0,0,0,0.1))"); // 添加阴影效果
    
    // 更新标签样式 - 更好的可读性
    cellsUpdate.select(".size-label")
      .transition()
      .duration(800)
      .attr("x", d => (d.x0 + d.x1) / 2)
      .attr("y", d => d.y0 + 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .attr("fill", d => {
        // 根据背景色自动选择文字颜色
        const bgColor = d3.color(this.colorScale(d.data.avgSalary || 0));
        return bgColor && bgColor.l < 0.5 ? "#ffffff" : "#2c3e50";
      })
      .style("text-shadow", d => {
        const bgColor = d3.color(this.colorScale(d.data.avgSalary || 0));
        return bgColor && bgColor.l < 0.5 ? "1px 1px 2px rgba(0,0,0,0.5)" : "1px 1px 2px rgba(255,255,255,0.8)";
      })
      .text(d => d.data.name);
    
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
    
    // 添加公司数量标签
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
    
    // 添加sparkline
    this.drawSparklines(cellsUpdate);
    
    // 进入动画
    cellsEnter.transition()
      .duration(800)
      .delay((d, i) => i * 100)
      .style("opacity", 1);
    
    // 交互
    cellsUpdate
      .on("mouseover", this.handleMouseOver.bind(this))
      .on("mouseout", this.handleMouseOut.bind(this))
      .on("click", this.handleClick.bind(this));
  }
  
  drawSparklines(selection) {
    selection.select(".sparkline").each(function(d) {
      const sparkline = d3.select(this);
      sparkline.selectAll("*").remove();
      
      const width = d.x1 - d.x0 - 10;
      const height = 8;
      const y = d.y1 - 15;
      
      if (width < 50) return; // 太小的格子不显示sparkline
      
      const data = [d.data.minSalary, d.data.avgSalary, d.data.maxSalary];
      const xScale = d3.scaleLinear()
        .domain([0, 2])
        .range([d.x0 + 5, d.x1 - 5]);
      
      const yScale = d3.scaleLinear()
        .domain(d3.extent(data))
        .range([y + height, y]);
      
      const line = d3.line()
        .x((d, i) => xScale(i))
        .y(d => yScale(d))
        .curve(d3.curveMonotoneX);
      
      sparkline.append("path")
        .datum(data)
        .attr("d", line)
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5)
        .attr("fill", "none");
      
      // 添加点
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
  
  categorizeJob(jobTitle) {
    const title = jobTitle.toLowerCase();
    if (title.includes("data scientist")) return "Data Scientist";
    if (title.includes("data engineer")) return "Data Engineer";
    if (title.includes("data analyst") || title.includes("analyst")) return "Data Analyst";
    if (title.includes("machine learning") || title.includes("ml engineer")) return "ML Engineer";
    return "Other";
  }
  
  handleMouseOver(event, d) {
    d3.select(event.currentTarget).select("rect")
      .transition()
      .duration(200)
      .attr("stroke-width", 4)
      .attr("stroke", "#1976d2")
      .style("filter", "drop-shadow(0 4px 12px rgba(25,118,210,0.3)) brightness(1.05)")
      .attr("transform", "scale(1.02)"); // 轻微放大效果
    
    this.showTooltip(event, d);
  }
  
  handleMouseOut(event, d) {
    d3.select(event.currentTarget).select("rect")
      .transition()
      .duration(200)
      .attr("stroke-width", 3)
      .attr("stroke", "#ffffff")
      .style("filter", "drop-shadow(0 2px 8px rgba(0,0,0,0.1))")
      .attr("transform", "scale(1)");
    
    this.hideTooltip();
  }
  
  handleClick(event, d) {
    // 触发公司规模选择事件
    const selectEvent = new CustomEvent("companySizeSelected", { 
      detail: { 
        size: d.data.name,
        data: d.data
      } 
    });
    document.dispatchEvent(selectEvent);
  }
  
  // 修改showTooltip方法
  showTooltip(event, d) {
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
    
    // 修复薪资格式化
    const formatSalary = (salary) => {
      if (!salary || salary === 0) return "$0.00k";
      return `$${(salary / 1000).toFixed(2)}k`;
    };
    
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
  
  hideTooltip() {
    d3.select(".treemap-tooltip").style("opacity", 0);
  }
}