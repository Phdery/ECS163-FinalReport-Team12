// 技能→职位类别→薪资四分位数 Sankey图
class SankeyViz {
  constructor(containerId) {
    this.container = d3.select(containerId);
    this.width = 800;
    this.height = 400;
    this.margin = { top: 30, right: 80, bottom: 30, left: 80 }; // 增加边距
    
    this.svg = this.container.append("svg")
      .attr("width", this.width)
      .attr("height", this.height);
      
    this.init();
  }
  
  init() {
    // 调整sankey布局尺寸，确保不溢出
    this.sankey = d3.sankey()
      .nodeWidth(15)
      .nodePadding(15) // 增加节点间距
      .size([this.width - this.margin.left - this.margin.right, 
             this.height - this.margin.top - this.margin.bottom]);
    
    this.g = this.svg.append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
    
    this.colorScale = d3.scaleOrdinal(d3.schemeSet3);
  }
  
  update(data, selectedState = null) {
    // 过滤数据
    let filteredData = data;
    if (selectedState) {
      filteredData = data.filter(d => d.state === selectedState);
    }
    
    // 构建Sankey数据
    const sankeyData = this.buildSankeyData(filteredData);
    
    // 计算布局
    this.sankey(sankeyData);
    
    // 清除旧元素
    this.g.selectAll("*").remove();
    
    // 绘制链接
    const links = this.g.selectAll(".link")
      .data(sankeyData.links)
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", d => this.getLinkColor(d))
      .attr("stroke-width", d => Math.max(1, d.width))
      .attr("fill", "none")
      .attr("opacity", 0.6)
      .style("mix-blend-mode", "multiply");
    
    // 绘制节点
    const nodes = this.g.selectAll(".node")
      .data(sankeyData.nodes)
      .enter()
      .append("g")
      .attr("class", "node");
    
    nodes.append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", d => this.getNodeColor(d))
      .attr("stroke", "#333")
      .attr("stroke-width", 1);
    
    // 添加节点标签
    nodes.append("text")
      .attr("x", d => {
        const containerWidth = this.width - this.margin.left - this.margin.right;
        if (d.x0 < containerWidth / 3) {
          return d.x1 + 6; // 左侧节点，标签在右边
        } else if (d.x0 > containerWidth * 2/3) {
          return d.x0 - 6; // 右侧节点，标签在左边
        } else {
          return d.x0 + (d.x1 - d.x0) / 2; // 中间节点，标签居中
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
        // 截断过长的文本
        const maxLength = 12;
        return d.name.length > maxLength ? d.name.substring(0, maxLength) + "..." : d.name;
      });
    
    // 添加交互
    this.addInteractions(links, nodes);
    
    // 进入动画
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
  
  buildSankeyData(data) {
    const skills = ["Python", "R", "Spark", "AWS/Cloud", "Excel"];
    const tracks = ["Data Scientist", "Data Engineer", "Data Analyst", "ML Engineer"];
    const salaryQuartiles = ["Q1 (Low)", "Q2 (Med-Low)", "Q3 (Med-High)", "Q4 (High)"];
    
    // 计算薪资四分位数
    const salaries = data.map(d => d.avg).filter(d => d > 0).sort((a, b) => a - b);
    const q1 = d3.quantile(salaries, 0.25);
    const q2 = d3.quantile(salaries, 0.5);
    const q3 = d3.quantile(salaries, 0.75);
    
    // 创建节点
    const nodes = [
      ...skills.map(skill => ({ name: skill, type: "skill", layer: 0 })),
      ...tracks.map(track => ({ name: track, type: "track", layer: 1 })),
      ...salaryQuartiles.map(q => ({ name: q, type: "salary", layer: 2 }))
    ];
    
    // 创建链接
    const links = [];
    
    // 技能 → 职位类别
    skills.forEach(skill => {
      const skillField = this.getSkillField(skill);
      tracks.forEach(track => {
        const relevantJobs = data.filter(d => 
          d[skillField] === 1 && this.categorizeJob(d.title) === track
        );
        
        if (relevantJobs.length > 0) {
          links.push({
            source: skills.indexOf(skill),
            target: skills.length + tracks.indexOf(track),
            value: relevantJobs.length, // 直接使用职位数量，更直观
            jobs: relevantJobs.length
          });
        }
      });
    });
    
    // 职位类别 → 薪资四分位数
    tracks.forEach(track => {
      const trackJobs = data.filter(d => this.categorizeJob(d.title) === track);
      
      salaryQuartiles.forEach((quartile, qIndex) => {
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
            avgSalary: d3.mean(quartileJobs, d => d.avg)
          });
        }
      });
    });
    
    // 过滤掉值太小的链接以减少视觉混乱
    const filteredLinks = links.filter(link => link.value >= 1);
    
    return { nodes, links: filteredLinks };
  }
  
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
  
  calculateTFIDF(tf, totalJobs, skill, track, allData) {
    // 简化的TF-IDF计算，确保数值合理
    const tf_score = tf / Math.max(totalJobs, 1);
    
    // 计算IDF: log(总文档数 / 包含该技能的文档数)
    const skillField = this.getSkillField(skill);
    const docsWithSkill = allData.filter(d => d[skillField] === 1).length;
    const idf = Math.log(allData.length / Math.max(docsWithSkill, 1));
    
    // 返回一个更合理的权重值
    return Math.max(tf_score * Math.max(idf, 0.1), 0.1) * tf; // 乘以tf来放大实际数量
  }
  
  categorizeJob(jobTitle) {
    const title = jobTitle.toLowerCase();
    if (title.includes("data scientist")) return "Data Scientist";
    if (title.includes("data engineer")) return "Data Engineer";  
    if (title.includes("data analyst") || title.includes("analyst")) return "Data Analyst";
    if (title.includes("machine learning") || title.includes("ml engineer")) return "ML Engineer";
    return "Other";
  }
  
  getLinkColor(d) {
    // 根据源节点类型着色
    if (d.source.type === "skill") {
      return this.colorScale(d.source.name);
    } else {
      return this.colorScale(d.source.name);
    }
  }
  
  getNodeColor(d) {
    if (d.type === "skill") return "#8dd3c7";
    if (d.type === "track") return "#ffffb3"; 
    return "#bebada";
  }
  
  addInteractions(links, nodes) {
    // 链接交互
    links
      .on("mouseover", (event, d) => {
        // 高亮相关链接和节点
        links.style("opacity", 0.1);
        d3.select(event.currentTarget).style("opacity", 0.8);
        
        this.showLinkTooltip(event, d);
      })
      .on("mouseout", () => {
        links.style("opacity", 0.6);
        this.hideTooltip();
      });
    
    // 节点交互
    nodes
      .on("mouseover", (event, d) => {
        // 高亮相关链接
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
        // 触发节点选择事件
        const selectEvent = new CustomEvent("sankeyNodeSelected", { 
          detail: { 
            node: d.name,
            type: d.type
          } 
        });
        document.dispatchEvent(selectEvent);
      });
  }
  
  showLinkTooltip(event, d) {
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
  
    let content = `<strong>${d.source.name} → ${d.target.name}</strong><br>`;
    if (d.jobs) {
      content += `Job Count: ${d.jobs}<br>`;
    }
    if (d.avgSalary) {
      content += `Average Salary: $${(d.avgSalary / 1000).toFixed(2)}k`;
    }
    
    tooltip.html(content)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px")
      .style("opacity", 1);
  }
  
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
  
  hideTooltip() {
    d3.select(".sankey-tooltip").style("opacity", 0);
  }
}