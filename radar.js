// 重新设计RadarChart布局
class RadarChart {
  constructor(containerId) {
    this.container = d3.select(containerId);
    this.width = 400; // 增加宽度
    this.height = 300;
    this.radius = Math.min(this.width, this.height) / 2 - 40;
    
    // 创建主容器div
    this.mainDiv = this.container.append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "30px")
      .style("justify-content", "center");
    
    // 创建图表容器
    this.chartDiv = this.mainDiv.append("div");
    this.svg = this.chartDiv.append("svg")
      .attr("width", this.width)
      .attr("height", this.height);
      
    this.g = this.svg.append("g")
      .attr("transform", `translate(${this.width/2},${this.height/2})`);
      
    this.skills = ["Python", "R", "Spark", "AWS/Cloud", "Excel"];
    this.userSkills = [0, 0, 0, 0, 0];
    this.industryAvg = [0, 0, 0, 0, 0];
    
    this.init();
  }
  
  init() {
    this.angleSlice = Math.PI * 2 / this.skills.length;
    
    this.rScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, this.radius]);
    
    this.drawGrid();
    this.drawAxisLabels();
    this.createControlPanel();
  }
  
  drawGrid() {
    // 绘制同心圆，使用更好的颜色
    const levels = 5;
    for (let level = 1; level <= levels; level++) {
      this.g.append("circle")
        .attr("r", this.radius * level / levels)
        .attr("fill", "none")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-width", 1)
        .style("opacity", 0.8);
    }
    
    // 添加百分比标签
    for (let level = 1; level <= levels; level++) {
      this.g.append("text")
        .attr("x", 5)
        .attr("y", -this.radius * level / levels + 3)
        .attr("font-size", "9px")
        .attr("fill", "#999")
        .text(`${level * 20}%`);
    }
    
    // 绘制轴线
    this.skills.forEach((skill, i) => {
      const angle = i * this.angleSlice - Math.PI / 2;
      this.g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", this.radius * Math.cos(angle))
        .attr("y2", this.radius * Math.sin(angle))
        .attr("stroke", "#e0e0e0")
        .attr("stroke-width", 1.5);
    });
  }
  
  drawAxisLabels() {
    this.skills.forEach((skill, i) => {
      const angle = i * this.angleSlice - Math.PI / 2;
      const x = (this.radius + 25) * Math.cos(angle);
      const y = (this.radius + 25) * Math.sin(angle);
      
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
  
  createControlPanel() {
    // 将控制面板放在图表右侧
    const panel = this.mainDiv.append("div")
      .attr("class", "skill-controls")
      .style("background", "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)")
      .style("padding", "20px")
      .style("border-radius", "8px")
      .style("border", "1px solid #dee2e6")
      .style("min-width", "280px")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.1)");
    
    panel.append("h4")
      .text("Set Your Skill Level:")
      .style("margin", "0 0 15px 0")
      .style("text-align", "center")
      .style("color", "#495057")
      .style("font-size", "16px");
    
    this.skills.forEach((skill, i) => {
      const skillDiv = panel.append("div")
        .style("margin", "12px 0")
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "space-between");
      
      skillDiv.append("label")
        .text(skill)
        .style("width", "80px")
        .style("font-size", "13px")
        .style("font-weight", "500")
        .style("color", "#495057");
      
      const slider = skillDiv.append("input")
        .attr("type", "range")
        .attr("min", 0)
        .attr("max", 1)
        .attr("step", 0.1)
        .attr("value", 0)
        .style("width", "140px")
        .style("margin", "0 10px")
        .style("accent-color", "#667eea") // 现代浏览器的滑块颜色
        .on("input", (event) => {
          this.userSkills[i] = +event.target.value;
          this.update();
          
          // 添加实时动效
          this.animateSkillChange(i);
        });
      
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
  
  // 新增：技能变化时的动效
  animateSkillChange(skillIndex) {
    const angle = skillIndex * this.angleSlice - Math.PI / 2;
    const r = this.rScale(this.userSkills[skillIndex]);
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    
    // 在该技能点添加闪烁效果
    this.g.append("circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 8)
      .attr("fill", "#667eea")
      .style("opacity", 0.8)
      .transition()
      .duration(600)
      .attr("r", 15)
      .style("opacity", 0)
      .remove();
  }
  
  updateIndustryAverage(data, selectedTrack = null) {
    // 计算选定职位类别的技能平均水平
    let filteredData = data;
    if (selectedTrack) {
      filteredData = data.filter(d => this.categorizeJob(d.title) === selectedTrack);
    }
    
    if (filteredData.length === 0) return;
    
    const skillFields = ["python_yn", "R_yn", "spark", "aws", "excel"];
    
    this.industryAvg = skillFields.map(field => {
      const skillCount = filteredData.filter(d => d[field] === 1).length;
      return skillCount / filteredData.length;
    });
    
    this.update();
  }
  
  update() {
    // 更新控制面板显示
    this.skills.forEach((skill, i) => {
      this.container.select(`.skill-value-${i}`)
        .text(`${(this.userSkills[i] * 100).toFixed(0)}%`);
    });
    
    // 清除旧的路径
    this.g.selectAll(".radar-path").remove();
    this.g.selectAll(".radar-dot").remove();
    
    // 绘制行业平均线
    if (this.industryAvg.some(d => d > 0)) {
      this.drawRadarPath(this.industryAvg, "#ff7f0e", "行业平均", 0.3);
    }
    
    // 绘制用户技能线
    if (this.userSkills.some(d => d > 0)) {
      this.drawRadarPath(this.userSkills, "#1f77b4", "你的技能", 0.7);
    }
    
    // 添加图例
    this.drawLegend();
    
    // 生成个人学习建议
    this.generateRecommendations();
  }
  
  drawRadarPath(data, color, label, opacity) {
    const pathData = data.map((value, i) => {
      const angle = i * this.angleSlice - Math.PI / 2;
      const r = this.rScale(value);
      return [r * Math.cos(angle), r * Math.sin(angle)];
    });
    
    // 闭合路径
    pathData.push(pathData[0]);
    
    const line = d3.line()
      .x(d => d[0])
      .y(d => d[1])
      .curve(d3.curveLinearClosed);
    
    // 绘制填充区域
    this.g.append("path")
      .datum(pathData)
      .attr("class", "radar-path")
      .attr("d", line)
      .attr("fill", color)
      .attr("fill-opacity", 0.15)
      .attr("stroke", color)
      .attr("stroke-width", 3)
      .style("opacity", 0)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");
    
    // 绘制数据点
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
    
    // 进入动画
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
  
  drawLegend() {
    this.g.selectAll(".legend").remove();
    
    const legend = this.g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${-this.radius}, ${this.radius + 20})`);
    
    const legendData = [
      { color: "#ff7f0e", label: "行业平均" },
      { color: "#1f77b4", label: "你的技能" }
    ];
    
    legendData.forEach((d, i) => {
      const g = legend.append("g")
        .attr("transform", `translate(${i * 80}, 0)`);
      
      g.append("line")
        .attr("x1", 0)
        .attr("x2", 15)
        .attr("stroke", d.color)
        .attr("stroke-width", 2);
      
      g.append("text")
        .attr("x", 20)
        .attr("dy", "0.35em")
        .attr("font-size", "10px")
        .attr("fill", "#333")
        .text(d.label);
    });
  }
  
  generateRecommendations() {
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
    
    const gaps = this.skills.map((skill, i) => ({
      skill,
      gap: this.industryAvg[i] - this.userSkills[i],
      index: i
    })).filter(d => d.gap > 0.2).sort((a, b) => b.gap - a.gap);
    
    if (gaps.length === 0) {
      recommendations.append("div")
        .style("margin-top", "8px")
        .style("color", "#2e7d32")
        .style("font-weight", "bold")
        .text("🎉 Your skills meet industry standards!");
    } else {
      const list = recommendations.append("ul")
        .style("margin", "8px 0 0 0")
        .style("padding-left", "20px");
      gaps.slice(0, 3).forEach(gap => {
        list.append("li")
          .style("margin", "4px 0")
          .style("color", "#424242")
          .text(`Improve ${gap.skill} skills (Gap: ${(gap.gap * 100).toFixed(0)}%)`);
      });
    }
  }
  
  categorizeJob(jobTitle) {
    const title = jobTitle.toLowerCase();
    if (title.includes("data scientist")) return "Data Scientist";
    if (title.includes("data engineer")) return "Data Engineer";
    if (title.includes("data analyst") || title.includes("analyst")) return "Data Analyst";
    if (title.includes("machine learning") || title.includes("ml engineer")) return "ML Engineer";
    return "Other";
  }
}