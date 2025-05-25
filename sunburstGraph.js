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
const sunburstWidth = 350;
const sunburstHeight = 350;
const radius = Math.min(sunburstWidth, sunburstHeight) / 2 - 10;
const color = d3.scaleOrdinal(d3.schemeSet3);

// 初始化函数
function initSkillsViz() {
    // 加载数据
    d3.csv("salary_data_cleaned.csv").then(data => {
        skillsData = data;
        
        // 设置自定义事件监听，当地图上选择了州时更新技能视图
        document.addEventListener("stateSelected", function(e) {
            const clickedState = e.detail.state;
            
            if (selectedState === clickedState && isVisualizationVisible) {
                // 如果点击的是同一个州且图表可见，则隐藏
                hideSkillsViz();
            } else {
                // 否则显示或更新图表
                selectedState = clickedState;
                updateSkillsViz(selectedState);
            }
        });
    }).catch(error => {
        console.error("加载数据时发生错误:", error);
    });
}

// 更新技能可视化
function updateSkillsViz(state) {
    if (!skillsData) return;
    
    // 过滤选中州的数据
    const stateData = skillsData.filter(d => d.job_state && d.job_state.trim() === state);
    
    // 如果没有数据，隐藏可视化
    if (stateData.length === 0) {
        hideSkillsViz();
        return;
    }

    // 获取州在地图中的位置
    const statePosition = getStatePosition(state);
    
    // 创建或更新可视化容器
    createOrUpdateContainer(statePosition);
    
    // 构建层次结构数据
    const hierarchyData = buildHierarchyData(stateData);
    
    // 绘制 Sunburst 图
    drawSunburst(hierarchyData, state);
    
    // 显示可视化并添加动效
    showSkillsVizWithAnimation();
}

// 获取州在地图中的中心位置
function getStatePosition(stateAbbr) {
    // 首先尝试从地图SVG中直接获取州的位置
    const mapSvg = d3.select("#map");
    const mapRect = mapSvg.node().getBoundingClientRect();
    
    // 查找对应的州路径元素
    const statePaths = mapSvg.selectAll("path").nodes();
    let targetPath = null;
    
    // 通过FIPS代码找到对应的路径
    if (window.debugData && window.debugData.fipsToAbbr) {
        const abbrToFips = {};
        Object.keys(window.debugData.fipsToAbbr).forEach(fips => {
            abbrToFips[window.debugData.fipsToAbbr[fips]] = fips;
        });
        
        const targetFips = abbrToFips[stateAbbr];
        if (targetFips && window.debugData.states) {
            const stateIndex = window.debugData.states.findIndex(s => s.id === targetFips);
            if (stateIndex >= 0 && statePaths[stateIndex]) {
                targetPath = statePaths[stateIndex];
            }
        }
    }
    
    if (targetPath) {
        // 获取路径的边界框
        const bbox = targetPath.getBBox();
        const pathCenterX = bbox.x + bbox.width / 2;
        const pathCenterY = bbox.y + bbox.height / 2;
        
        // 转换为页面坐标
        const pageX = mapRect.left + pathCenterX;
        const pageY = mapRect.top + pathCenterY;
        
        // 计算图表位置，确保不超出屏幕边界
        const chartWidth = sunburstWidth + 40;
        const chartHeight = sunburstHeight + 60;
        
        let x = pageX + 150; // 默认放在州的右侧
        let y = pageY - chartHeight / 2; // 垂直居中
        
        // 检查右边界，如果超出则放在左侧
        if (x + chartWidth > window.innerWidth - 20) {
            x = pageX - chartWidth - 150;
        }
        
        // 检查上下边界
        if (y < 20) {
            y = 20;
        } else if (y + chartHeight > window.innerHeight - 20) {
            y = window.innerHeight - chartHeight - 20;
        }
        
        // 确保左边界
        if (x < 20) {
            x = 20;
        }
        
        console.log(`州 ${stateAbbr} 的图表位置: x=${x}, y=${y}`);
        return { x, y };
    }
    
    // 备用方案：放在地图右侧的固定位置
    const fallbackX = Math.min(mapRect.right + 20, window.innerWidth - sunburstWidth - 60);
    const fallbackY = Math.max(mapRect.top + 50, 50);
    
    console.log(`使用备用位置: x=${fallbackX}, y=${fallbackY}`);
    return { 
        x: fallbackX, 
        y: fallbackY 
    };
}

// 创建或更新容器
function createOrUpdateContainer(position) {
    // 移除现有容器
    d3.select(".skills-viz").remove();
    
    // 创建新容器，使用fixed定位确保相对于视口
    const container = d3.select("body")
        .append("div")
        .attr("class", "skills-viz")
        .style("position", "fixed") // 改为fixed定位
        .style("left", `${position.x}px`)
        .style("top", `${position.y}px`)
        .style("width", `${sunburstWidth + 40}px`)
        .style("height", `${sunburstHeight + 60}px`)
        .style("background", "rgba(255, 255, 255, 0.95)")
        .style("border", "2px solid #333")
        .style("border-radius", "8px")
        .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
        .style("padding", "15px")
        .style("z-index", "1000")
        .style("opacity", 0)
        .style("transform", "scale(0.8)")
        .style("pointer-events", "none")
        .style("max-width", "90vw") // 确保不超出视口
        .style("max-height", "90vh");
    
    // 添加关闭按钮
    container.append("div")
        .style("position", "absolute")
        .style("top", "5px")
        .style("right", "10px")
        .style("cursor", "pointer")
        .style("font-size", "18px")
        .style("color", "#666")
        .style("font-weight", "bold")
        .style("user-select", "none")
        .text("×")
        .on("click", hideSkillsViz);
    
    // 添加标题
    container.append("h3")
        .attr("class", "skills-title")
        .style("text-align", "center")
        .style("margin", "0 0 10px 0")
        .style("font-size", "14px")
        .style("color", "#333")
        .text(`${selectedState}州职位与技能分布`);

    // 添加SVG容器
    container.append("svg")
        .attr("width", sunburstWidth)
        .attr("height", sunburstHeight)
        .append("g")
        .attr("transform", `translate(${sunburstWidth / 2},${sunburstHeight / 2})`);
}

// 构建层次结构数据（改进的职位分类）
function buildHierarchyData(stateData) {
    const jobTitles = {};
    
    stateData.forEach(d => {
        let jobCategory = categorizeJob(d["Job Title"] || "");
        
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
        
        // 增加职位计数
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

// 改进的职位分类函数
function categorizeJob(jobTitle) {
    const title = jobTitle.toLowerCase();
    
    if (title.includes("data scientist")) {
        return "Data Scientist";
    } else if (title.includes("data engineer") || title.includes("data engineering")) {
        return "Data Engineer";
    } else if (title.includes("data analyst") || title.includes("analyst")) {
        return "Data Analyst";
    } else if (title.includes("machine learning") || title.includes("ml engineer")) {
        return "ML Engineer";
    } else if (title.includes("research scientist") || title.includes("researcher")) {
        return "Research Scientist";
    } else if (title.includes("software engineer") || title.includes("software developer")) {
        return "Software Engineer";
    } else if (title.includes("product manager") || title.includes("product")) {
        return "Product Manager";
    } else if (title.includes("business analyst") || title.includes("business intelligence")) {
        return "Business Analyst";
    } else if (title.includes("engineer")) {
        return "Engineer";
    } else if (title.includes("manager") || title.includes("director") || title.includes("lead")) {
        return "Management";
    } else {
        return "Other";
    }
}

// 绘制 Sunburst 图（添加动效）
function drawSunburst(hierarchyData, stateName) {
    const sunburstSvg = d3.select(".skills-viz svg g");
    sunburstSvg.selectAll("*").remove();
    
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
        
        // 显示提示框
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
    let tooltip = d3.select(".sunburst-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("class", "sunburst-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0,0,0,0.8)")
            .style("color", "white")
            .style("padding", "8px 12px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "10000")
            .style("opacity", 0);
    }
    
    let content = `<strong>${d.data.name}</strong><br>数量: ${d.value}`;
    if (d.depth === 2 && d.parent) {
        const percentage = (d.value / d.parent.value * 100).toFixed(1);
        content += `<br>占比: ${percentage}%`;
    }
    
    tooltip.html(content)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px")
        .transition()
        .duration(200)
        .style("opacity", 1);
}

// 隐藏提示框
function hideTooltip() {
    d3.select(".sunburst-tooltip")
        .transition()
        .duration(200)
        .style("opacity", 0);
}

// 显示可视化并添加动效
function showSkillsVizWithAnimation() {
    const container = d3.select(".skills-viz");
    
    container
        .style("pointer-events", "all")
        .transition()
        .duration(500)
        .ease(d3.easeBackOut)
        .style("opacity", 1)
        .style("transform", "scale(1)");
    
    isVisualizationVisible = true;
}

// 隐藏技能可视化
function hideSkillsViz() {
    const container = d3.select(".skills-viz");
    
    container
        .transition()
        .duration(300)
        .ease(d3.easeBackIn)
        .style("opacity", 0)
        .style("transform", "scale(0.8)")
        .on("end", function() {
            container.remove();
        });
    
    hideTooltip();
    isVisualizationVisible = false;
    selectedState = null;
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