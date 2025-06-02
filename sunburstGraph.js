// 州内赛道比较：Sunburst + Treemap 组合可视化

// 全局变量
let skillsData;
let selectedState = null;
let isVisualizationVisible = false;

const skillClusters = {
    "python_yn": "Python",
    "R_yn": "R",
    "spark": "Spark",
    "aws": "AWS/Cloud",
    "excel": "Excel"
};

// Sunburst 图尺寸和配置
const sunburstWidth = 300;
const sunburstHeight = 300;
const radius = Math.min(sunburstWidth, sunburstHeight) / 2 - 10;
const color = d3.scaleOrdinal(d3.schemeSet3);

// 初始化函数
function initSkillsViz() {
    // 初始状态显示提示
    clearSunburstContainer();
    
    // 设置自定义事件监听
    document.addEventListener("stateSelected", function(e) {
        const clickedState = e.detail.state;
        selectedState = clickedState;
        updateSkillsViz(selectedState);
    });
}

// 更新技能可视化
function updateSkillsViz(state) {
    // 直接使用dashboard数据
    if (window.dashboard && window.dashboard.data) {
        const stateData = window.dashboard.data.filter(d => d.state === state);
        if (stateData.length > 0) {
            processStateData(stateData, state);
            return;
        }
    }
    
    // 如果没有数据，清空容器
    clearSunburstContainer();
}

// 新增清空容器函数
function clearSunburstContainer() {
    const container = d3.select(".sunburst-container");
    container.selectAll("svg").remove();
    container.selectAll("p").remove();
    container.append("p")
        .style("text-align", "center")
        .style("color", "#666")
        .style("margin-top", "50px")
        .text("Click a state to see job tracks and skills");
}

// 完全重写容器创建逻辑
function createOrUpdateContainer(stateName) {
    // 清除之前的内容
    const container = d3.select(".sunburst-container");
    container.selectAll("svg").remove();
    container.selectAll("p").remove();
    
    // 更新标题
    container.select("h3")
        .text(`${stateName} - Job Tracks & Skills`);
    
    // 在容器中创建SVG
    const svg = container.append("svg")
        .attr("width", sunburstWidth)
        .attr("height", sunburstHeight)
        .style("display", "block")
        .style("margin", "0 auto");
    
    const g = svg.append("g")
        .attr("transform", `translate(${sunburstWidth / 2}, ${sunburstHeight / 2})`);
    
    return g;
}

// 新增处理州数据的函数
function processStateData(stateData, state) {
    // 创建或更新容器
    const svgGroup = createOrUpdateContainer(state);
    
    // 构建层次结构数据
    const hierarchyData = buildHierarchyData(stateData);
    
    // 绘制 Sunburst 图
    drawSunburst(hierarchyData, state, svgGroup);
}

// 添加缺失的 buildHierarchyData 函数
function buildHierarchyData(stateData) {
    const jobTitles = {};
    
    stateData.forEach(d => {
        let jobCategory = categorizeJob(d.title || "");
        
        if (!jobTitles[jobCategory]) {
            jobTitles[jobCategory] = {
                name: jobCategory,
                value: 0,
                children: []
            };
            
            // 为每个技能创建子节点
            Object.keys(skillClusters).forEach(skill => {
                jobTitles[jobCategory].children.push({
                    name: skillClusters[skill],
                    value: 0,
                    skill: skill
                });
            });
        }
        
        jobTitles[jobCategory].value++;
        
        // 计算每个技能的频率
        Object.keys(skillClusters).forEach(skill => {
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
    
    return {
        name: "root",
        children: Object.values(jobTitles)
    };
}

// 添加缺失的 categorizeJob 函数
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

// 绘制 Sunburst 图（添加动效）
function drawSunburst(hierarchyData, stateName, sunburstSvg) {
    sunburstSvg.selectAll("*").remove();
    
    console.log("Drawing sunburst with data:", hierarchyData);
    
    // 创建分区布局
    const partition = d3.partition()
        .size([2 * Math.PI, radius]);
    
    // 层次结构数据转换
    const root = d3.hierarchy(hierarchyData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);
    
    // 计算分区布局
    partition(root);
    
    // 创建弧生成器
    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1);
    
    // 绘制弧并添加动效
    const paths = sunburstSvg.selectAll("path")
        .data(root.descendants())
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => {
            if (d.depth === 0) return "transparent";
            if (d.depth === 1) return color(d.data.name);
            return d3.color(color(d.parent.data.name)).brighter(0.3);
        })
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("opacity", 0);
    
    // 路径动画
    paths.transition()
        .duration(800)
        .delay((d, i) => i * 50)
        .ease(d3.easeElasticOut)
        .style("opacity", 0.9);
    
    // 添加标签
    const labels = sunburstSvg.selectAll("text")
        .data(root.descendants().filter(d => {
            if (d.depth === 0) return false;
            const angle = d.x1 - d.x0;
            const radius = (d.y0 + d.y1) / 2;
            return angle * radius > 15; // 只显示足够大的扇区的标签
        }))
        .enter()
        .append("text")
        .attr("transform", d => {
            const angle = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const radius = (d.y0 + d.y1) / 2;
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
    
    // 标签动画
    labels.transition()
        .duration(600)
        .delay(800)
        .style("opacity", 1);
    
    // 添加交互效果
    paths.on("mouseover", function(event, d) {
        if (d.depth === 0) return;
        
        d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 1)
            .attr("stroke-width", 3);
        
        showTooltip(event, d);
    })
    .on("mouseout", function(event, d) {
        if (d.depth === 0) return;
        
        d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 0.9)
            .attr("stroke-width", 2);
        
        hideTooltip();
    });
}

// 显示提示框
function showTooltip(event, d) {
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

// 隐藏提示框
function hideTooltip() {
    d3.select(".sunburst-tooltip")
        .transition()
        .duration(200)
        .style("opacity", 0);
}

// 确保文档加载完成后初始化
document.addEventListener("DOMContentLoaded", initSkillsViz);

// 辅助函数：为测试创建州选择事件
function selectState(stateAbbr) {
    const event = new CustomEvent("stateSelected", { 
        detail: { state: stateAbbr } 
    });
    document.dispatchEvent(event);
}