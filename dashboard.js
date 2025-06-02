// 主要的仪表板协调器，管理所有组件之间的交互
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
      // 等待地图数据加载完成
      await this.waitForMapData();
      
      // 将dashboard实例存储到全局，供其他组件使用
      window.dashboard = this;
      
      // 初始化各个组件
      this.treemap = new TreemapViz("#treemap");
      this.sankey = new SankeyViz("#sankey");
      this.radar = new RadarChart("#radar");
      
      // 设置事件监听
      this.setupEventListeners();
      
      console.log("Dashboard initialized successfully");
      console.log("Dashboard data sample:", this.data.slice(0, 3));
    } catch (error) {
      console.error("Dashboard initialization failed:", error);
    }
  }
  
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
      
      // 超时处理
      setTimeout(() => reject(new Error("Map data loading timeout")), 10000);
    });
  }
  
  // 修复extractDataFromMap方法，确保正确提取薪资数据
  extractDataFromMap() {
    const allData = [];
    
    if (window.debugData && window.debugData.rows) {
      console.log("原始数据示例:", window.debugData.rows[0]); // 调试原始数据结构
      
      window.debugData.rows.forEach(job => {
        if (job.state && job.state.length === 2) {
          // 正确提取薪资字段 - 使用原始CSV中的字段名
          let avgSalary = 0;
          
          // 尝试多个可能的薪资字段名
          if (job.avg_salary) {
            avgSalary = parseFloat(job.avg_salary) || 0;
          } else if (job.avg) {
            avgSalary = parseFloat(job.avg) || 0;
          } else if (job['Salary Estimate']) {
            // 如果是薪资估算字符串，提取数字
            const salaryMatch = job['Salary Estimate'].match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
            avgSalary = salaryMatch ? parseFloat(salaryMatch[1].replace(/,/g, '')) : 0;
          }
          
          // 确保薪资在合理范围内 (30k - 300k)
          if (avgSalary < 30000 || avgSalary > 300000) {
            avgSalary = avgSalary < 1000 ? avgSalary * 1000 : avgSalary; // 如果是k为单位，转换为实际数字
          }
          
          const minSalary = job.min_salary ? parseFloat(job.min_salary) : avgSalary * 0.8;
          const maxSalary = job.max_salary ? parseFloat(job.max_salary) : avgSalary * 1.2;
          
          allData.push({
            state: job.state,
            title: job.title || job["Job Title"] || "",
            avg: avgSalary,
            min: minSalary,
            max: maxSalary,
            // 确保技能字段为数字
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
    
    console.log("提取的数据示例:", allData.slice(0, 5));
    console.log("薪资范围:", {
      min: d3.min(allData, d => d.avg),
      max: d3.max(allData, d => d.avg),
      avg: d3.mean(allData, d => d.avg)
    });
    
    return allData;
  }
  
  setupEventListeners() {
    // 监听州选择事件
    document.addEventListener("stateSelected", (e) => {
      this.handleStateSelection(e.detail.state);
    });
    
    // 监听职位类别选择事件
    document.addEventListener("jobTrackSelected", (e) => {
      this.handleTrackSelection(e.detail.track);
    });
    
    // 监听公司规模选择事件
    document.addEventListener("companySizeSelected", (e) => {
      this.handleCompanySizeSelection(e.detail.size);
    });
    
    // 监听Sankey节点选择事件
    document.addEventListener("sankeyNodeSelected", (e) => {
      this.handleSankeyNodeSelection(e.detail.node, e.detail.type);
    });
  }
  
  handleStateSelection(state) {
    this.selectedState = state;
    this.selectedTrack = null;
    this.selectedCompanySize = null;
    
    // 更新面包屑导航
    this.updateBreadcrumb(`${state} → Select a job track`);
    
    // 更新所有相关组件
    const stateData = this.data.filter(d => d.state === state);
    
    if (stateData.length > 0) {
      this.treemap.update(stateData);
      this.sankey.update(stateData, state);
      this.radar.updateIndustryAverage(stateData);
    }
    
    console.log(`Selected state: ${state}, ${stateData.length} jobs found`);
  }
  
  handleTrackSelection(track) {
    this.selectedTrack = track;
    this.updateBreadcrumb(`${this.selectedState} → ${track}`);
    
    const filteredData = this.data.filter(d => 
      d.state === this.selectedState && 
      this.categorizeJob(d.title) === track
    );
    
    this.treemap.update(filteredData, track);
    this.radar.updateIndustryAverage(filteredData, track);
  }
  
  handleCompanySizeSelection(size) {
    this.selectedCompanySize = size;
    console.log(`Selected company size: ${size}`);
  }
  
  handleSankeyNodeSelection(node, type) {
    console.log(`Selected Sankey node: ${node} (${type})`);
    
    if (type === "track") {
      this.handleTrackSelection(node);
    }
  }
  
  categorizeJob(jobTitle) {
    if (!jobTitle) return "Other";
    
    const title = jobTitle.toLowerCase();
    if (title.includes("data scientist")) return "Data Scientist";
    if (title.includes("data engineer")) return "Data Engineer";
    if (title.includes("data analyst") || title.includes("analyst")) return "Data Analyst";
    if (title.includes("machine learning") || title.includes("ml engineer")) return "ML Engineer";
    return "Other";
  }
  
  generateRandomSize() {
    const sizes = ["Small (1-200)", "Medium (201-1000)", "Large (1000+)"];
    return sizes[Math.floor(Math.random() * sizes.length)];
  }
  
  updateBreadcrumb(text) {
    const breadcrumb = document.getElementById("breadcrumb-text");
    if (breadcrumb) {
      breadcrumb.textContent = text;
    }
  }
}

// 初始化dashboard
document.addEventListener("DOMContentLoaded", () => {
  new Dashboard();
});